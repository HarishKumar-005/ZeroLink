
/**
 * @fileoverview A production-ready Gemini API key rotator with retry, backoff, and cooldown logic.
 */
import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';

// The default model to use for Gemini API calls. Manually configured to use the gemini-1.5-flash model.
const DEFAULT_MODEL = 'gemini-2.5-flash';
const COOLDOWN_DURATION_MS = 60 * 1000; // 60 seconds
const MAX_FAILURES_PER_KEY = 5;
const MAX_RETRIES = 10; // Increased from 5
const BACKOFF_INITIAL_MS = 300;
const BACKOFF_MAX_MS = 10000; // Increased from 5000

interface KeyState {
  cooldownUntil: number;
  failures: number;
  isDisabled: boolean;
}

export interface RequestOptions {
  prompt: string;
  model?: string;
}

interface SuccessResponse {
  success: true;
  data: any;
}

interface ErrorResponse {
  success: false;
  error: string;
  status: number;
}

// State variables
let apiKeys: string[] = [];
let keyStates: Map<string, KeyState> = new Map();
let currentKeyIndex = 0;

// In-memory cache with better TTL strategy
const cache = new LRUCache<string, any>({
  max: 100,
  ttl: 1000 * 60 * 5, // Increased to 5 minutes for better reuse
  updateAgeOnGet: true, // Reset TTL on cache hit
});

/**
 * Initializes the key rotator by discovering API keys from environment variables.
 */
function initializeKeys() {
  if (apiKeys.length > 0) return;

  const discoveredKeys = Object.keys(process.env)
    .filter((key) => key.startsWith('GEMINI_API_KEY'))
    .sort()
    .map((key) => process.env[key] as string)
    .filter(Boolean);

  // Remove duplicate keys to prevent unnecessary cycling and quota exhaustion.
  const uniqueKeys = [...new Set(discoveredKeys)];

  if (uniqueKeys.length === 0) {
    console.error('CRITICAL: No unique GEMINI_API_KEY environment variables found.');
  }

  apiKeys = uniqueKeys;
  keyStates = new Map(
    apiKeys.map((key) => [
      key,
      { cooldownUntil: 0, failures: 0, isDisabled: false },
    ])
  );
  console.log(`[GeminiKeyRotator] Initialized with ${apiKeys.length} unique API keys.`);
}

/**
 * Gets the next available API key in a round-robin fashion, skipping cooled-down or disabled keys.
 * @returns The next available API key or null if all are unavailable.
 */
function getNextKey(): { key: string | null, waitMs: number } {
  const totalKeys = apiKeys.length;
  if (totalKeys === 0) return { key: null, waitMs: 0 };

  let shortestWait = Infinity;

  for (let i = 0; i < totalKeys; i++) {
    const key = apiKeys[currentKeyIndex];
    const state = keyStates.get(key)!;
    currentKeyIndex = (currentKeyIndex + 1) % totalKeys;

    if (!state.isDisabled) {
        const now = Date.now();
        if (now >= state.cooldownUntil) {
            return { key, waitMs: 0 }; // Found an available key
        }
        // Key is on cooldown, track the minimum wait time
        shortestWait = Math.min(shortestWait, state.cooldownUntil - now);
    }
  }

  // If we get here, all non-disabled keys are on cooldown
  return { key: null, waitMs: shortestWait }; 
}

/**
 * Masks an API key for safe logging.
 * @param key The API key to mask.
 * @returns The masked key.
 */
const maskKey = (key: string) => `...${key.slice(-6)}`;

/**
 * Generates content using the Gemini API with key rotation, retry, and backoff logic.
 * @param options - The options for the generation request.
 * @returns A promise that resolves to the generated data or an error.
 */
export async function generateWithFallback(
  options: RequestOptions
): Promise<SuccessResponse | ErrorResponse> {
  initializeKeys(); // Ensures keys are loaded on first call

  const cacheKey = createHash('sha256')
    .update(
      options.prompt +
        (options.model || DEFAULT_MODEL)
    )
    .digest('hex');

  if (cache.has(cacheKey)) {
    console.log('[GeminiKeyRotator] Returning cached response.');
    return { success: true, data: cache.get(cacheKey) };
  }
  
  let backoff = BACKOFF_INITIAL_MS;
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    attempts++;
    const { key: apiKey, waitMs } = getNextKey();

    if (!apiKey) {
      if (waitMs === Infinity || attempts === MAX_RETRIES) {
        return { success: false, error: 'All API keys are permanently disabled or on cooldown.', status: 503 };
      }
      console.warn(`[GeminiKeyRotator] All keys are on cooldown. Waiting for ${waitMs}ms before retry #${attempts + 1}...`);
      await sleepWithJitter(waitMs);
      continue; // Retry getting a key
    }
    
    console.log(`[GeminiKeyRotator] Attempt #${attempts} with key ${maskKey(apiKey)}`);

    try {
      // Use the specified model or the default one.
      const model = options.model || DEFAULT_MODEL;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const body: any = {
        contents: [{ parts: [{ text: options.prompt }] }],
      };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      // 400-level errors are client errors, don't retry.
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        const errorBody = await response.text();
        console.error(`[GeminiKeyRotator] Client Error ${response.status} with key ${maskKey(apiKey)}. Aborting.`, errorBody);
        return { success: false, error: `Client Error: ${response.status} ${errorBody}`, status: response.status };
      }

      if (response.status === 429) {
        console.warn(`[GeminiKeyRotator] Key ${maskKey(apiKey)} is rate-limited (429). Placing on cooldown.`);
        const state = keyStates.get(apiKey)!;
        state.cooldownUntil = Date.now() + COOLDOWN_DURATION_MS;
        state.failures++;
        if (state.failures >= MAX_FAILURES_PER_KEY) {
          state.isDisabled = true;
          console.error(`[GeminiKeyRotator] Key ${maskKey(apiKey)} has been disabled after repeated failures.`);
        }
        continue; // Immediately try next key
      }

      if (!response.ok) {
        // This will catch 5xx server errors, which are worth retrying.
        throw new Error(`API request failed with status ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      
      if (!result.candidates || result.candidates.length === 0) {
        // Handle cases where the API returns a 200 OK but no content (e.g., safety blocked)
        const blockReason = result.promptFeedback?.blockReason || 'No content returned';
        // This is a "successful" response in that the key worked, but the content was blocked.
        // We shouldn't retry this with other keys.
        return { success: false, error: `Content generation was blocked. Reason: ${blockReason}`, status: 400 };
      }

      const responseData = result.candidates[0].content.parts[0].text;
      
      cache.set(cacheKey, responseData);
      return { success: true, data: responseData };

    } catch (error) {
      console.error(`[GeminiKeyRotator] Error with key ${maskKey(apiKey)}:`, error);
      // For network errors or 5xx, apply backoff before next attempt
      await sleepWithJitter(backoff);
      backoff = Math.min(BACKOFF_MAX_MS, backoff * 2);
    }
  }

  // If the loop finishes, it means all retries have been exhausted.
  return { success: false, error: 'All retry attempts failed to get a response from the AI service.', status: 503 };
}

/**
 * Helper function to sleep for a duration with jitter.
 * @param ms - The base duration in milliseconds.
 */
const sleepWithJitter = (ms: number) => {
  const jitter = Math.random() * 200 - 100; // -100ms to +100ms
  return new Promise(resolve => setTimeout(resolve, Math.max(0, ms + jitter)));
}

/**
 * Gets the current status of all API keys for debugging.
 */
export async function getKeyStatus() {
  initializeKeys();
  const now = Date.now();
  return apiKeys.map(key => {
    const state = keyStates.get(key)!;
    return {
      key: maskKey(key),
      status: state.isDisabled ? 'disabled' : (now < state.cooldownUntil ? 'cooldown' : 'available'),
      failures: state.failures,
      cooldownEndsIn: now < state.cooldownUntil ? `${Math.round((state.cooldownUntil - now) / 1000)}s` : 'N/A',
    };
  });
}
