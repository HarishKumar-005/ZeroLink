
import {genkit, type ModelAction, type Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {generateWithFallback, type RequestOptions} from '../lib/gemini-key-rotator';
import {zodToJsonSchema} from 'zod-to-json-schema';

// This is the custom model action that will be used by all Genkit flows.
// It acts as a bridge between Genkit's request format and our custom key rotator.
const geminiRotatorModel: ModelAction = async request => {
  // 1. Extract the text prompt from Genkit's message structure.
  const prompt = request.messages.map(m => m.content[0].text || '').join('\n');

  // 2. Prepare the options for our key rotator.
  const options: RequestOptions = {
    prompt,
    model: 'gemini-2.5-flash', // We are targeting a specific model
  };

  // 3. CRITICAL FIX: Correctly extract the JSON schema if the request asks for structured output.
  if (
    request.config?.response?.format === 'structured' &&
    request.config.response.schema
  ) {
    // Convert Zod schema to JSON schema format that the Gemini API understands.
    const jsonSchema = zodToJsonSchema(request.config.response.schema);
    
    // The Gemini API does not support top-level $schema, definitions, or $ref properties.
    // We need to create a "clean" version of the schema for the API.
    const apiClientSchema = { ...jsonSchema };
    delete (apiClientSchema as any).$schema;
    delete (apiClientSchema as any).definitions;
    delete (apiClientSchema as any).$ref;
    
    options.responseJsonSchema = apiClientSchema;
    options.responseMimeType = 'application/json';
  }

  // 4. Call our robust key rotator with the prepared options.
  const result = await generateWithFallback(options);

  if (!result.success) {
    throw new Error(result.error);
  }

  // 5. Map the output from our rotator back to the format Genkit expects.
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

/**
 * Creates a Genkit plugin that provides the key-rotating Gemini model.
 */
export const geminiRotator: Plugin = (name = 'geminiRotator') => {
  return (ai) => ({
    name,
    models: [
      ai.defineModel(
        {
          name: 'googleai/gemini-rotator',
          label: 'Gemini (Key Rotator)',
          versions: ['gemini-2.5-flash'],
          supports: {
            media: false,
            multiturn: true,
            tools: false,
            systemRole: false,
            output: ['text', 'structured'],
          },
        },
        geminiRotatorModel
      ),
    ],
  });
};


// 3. Export a final `ai` object that includes the custom model and sets it as the default.
export const ai = genkit({
  plugins: [googleAI(), geminiRotator()],
  model: 'googleai/gemini-rotator', // Set our custom rotator model as the default
  flowStateStore: 'firebase',
  traceStore: 'firebase',
  flowStallTimeout: 60000,
});
