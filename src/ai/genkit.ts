import {genkit, type ModelAction} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {
  generateWithFallback,
  type RequestOptions,
} from '../lib/gemini-key-rotator';

// Define a custom model that uses our key rotator
const gemini25FlashRotator: ModelAction = async (request) => {
  // 1. Convert Genkit's input messages to a single string prompt.
  const prompt = request.messages.map((m) => m.content[0].text || '').join('\n');

  // 2. Extract schema and mime type from Genkit config.
  const options: RequestOptions = {
    prompt,
    model: 'gemini-2.5-flash',
  };
  if (request.config?.response?.schema) {
    options.responseJsonSchema = request.config.response.schema;
    options.responseMimeType = 'application/json';
  }

  // 3. Call our custom key rotator.
  const result = await generateWithFallback(options);

  if (!result.success) {
    throw new Error(result.error);
  }

  // 4. Map the output back to the Genkit response format.
  return {
    candidates: [
      {
        index: 0,
        finishReason: 'STOP',
        message: {
          role: 'model',
          content: [
            {
              text:
                typeof result.data === 'string'
                  ? result.data
                  : JSON.stringify(result.data),
            },
          ],
        },
      },
    ],
  };
};

export const ai = genkit({
  plugins: [
    // We still include the googleAI plugin, but we won't use its default model.
    googleAI(),

    // Define our custom model plugin.
    ai.defineModel(
      {
        name: 'googleai/gemini-2.5-flash-rotator',
        label: 'Gemini 2.5 Flash (Rotator)',
        versions: ['gemini-2.5-flash'],
        supports: {
          media: false,
          multiturn: true,
          tools: false,
          systemRole: false,
        },
      },
      gemini25FlashRotator
    ),
  ],
  // Manually configured to use our custom rotator model for all Genkit flows.
  model: 'googleai/gemini-2.5-flash-rotator',
});
