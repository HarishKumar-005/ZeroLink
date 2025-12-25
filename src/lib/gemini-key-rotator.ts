/**
 * @fileoverview A production-ready Gemini API key rotator with retry, backoff, and cooldown logic.
 */
import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';

// The default model to use for Gemini API calls. Manually configured to use the gemini-2.5-flash model.
const DEFAULT_MODEL = 'gemini-2.5-flash';
const COOLDOWN_DURATION_MS = 60 * 1000; // 60 seconds
const MAX_FAILURES_PER_KEY = 5;
const MAX_ATTEMPTS = 6;
const BACKOFF_INITIAL_MS = 300;
const BACKOFF_MAX_MS = 5000;

interface KeyState {
  cooldownUntil: number;
  failures: number;
  isDisabled: boolean;
}

export interface RequestOptions {
  prompt: string;
  model?: string;
  responseJsonSchema?: Record<string, any>;
  responseMimeType?: 'application/json';
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

// In-memory cache
const cache = new LRUCache<string, any>({
  max: 100,
  ttl: 1000 * 60, // 60 seconds
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
function getNextKey(): string | null {
  const totalKeys = apiKeys.length;
  if (totalKeys === 0) return null;

  for (let i = 0; i < totalKeys; i++) {
    const key = apiKeys[currentKeyIndex];
    const state = keyStates.get(key)!;
    currentKeyIndex = (currentKeyIndex + 1) % totalKeys;

    if (state.isDisabled || Date.now() < state.cooldownUntil) {
      continue;
    }
    return key;
  }
  return null; // All keys are on cooldown or disabled
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
        (options.model || DEFAULT_MODEL) +
        JSON.stringify(options.responseJsonSchema || {})
    )
    .digest('hex');

  if (cache.has(cacheKey)) {
    console.log('[GeminiKeyRotator] Returning cached response.');
    return { success: true, data: cache.get(cacheKey) };
  }
  
  const maxRetries = Math.min(MAX_ATTEMPTS, apiKeys.length * 2);
  let attempts = 0;
  let backoff = BACKOFF_INITIAL_MS;

  while (attempts < maxRetries) {
    attempts++;
    const apiKey = getNextKey();

    if (!apiKey) {
      console.warn('[GeminiKeyRotator] All keys are on cooldown. Waiting before retry...');
      await sleepWithJitter(BACKOFF_MAX_MS);
      continue;
    }
    
    console.log(`[GeminiKeyRotator] Attempt #${attempts} with key ${maskKey(apiKey)}`);

    try {
      // Use the specified model or the default one.
      const model = options.model || DEFAULT_MODEL;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const body: any = {
        contents: [{ parts: [{ text: options.prompt }] }],
        generationConfig: {}
      };

      if (options.responseJsonSchema && options.responseMimeType === 'application/json') {
        body.generationConfig.response_mime_type = 'application/json';
        body.generationConfig.response_schema = options.responseJsonSchema;
      }
      
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
        throw new Error(`Request was blocked or returned no candidates. Reason: ${blockReason}`);
      }

      const responseData = result.candidates[0].content.parts[0].text;
      
      let finalData = responseData;
      if (options.responseMimeType === 'application/json') {
          try {
            finalData = JSON.parse(responseData);
          } catch (e) {
            throw new Error(`Failed to parse JSON response: ${responseData}`);
          }
      }
      
      cache.set(cacheKey, finalData);
      return { success: true, data: finalData };

    } catch (error) {
      console.error(`[GeminiKeyRotator] Error with key ${maskKey(apiKey)}:`, error);
      // For network errors or 5xx, apply backoff before next attempt
      await sleepWithJitter(backoff);
      backoff = Math.min(BACKOFF_MAX_MS, backoff * 2);
    }
  }

  return { success: false, error: 'All API keys failed or are on cooldown. Please try again later.', status: 503 };
}

/**
 * Helper function to sleep for a duration with jitter.
 * @param ms - The base duration in milliseconds.
 */
const sleepWithJitter = (ms: number) => {
  const jitter = Math.random() * 200 - 100; // -100ms to +100ms
  return new Promise(resolve => setTimeout(resolve, Math.max(0, ms + jitter)));
}
