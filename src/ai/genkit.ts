
import {genkit, type ModelAction, defineModel} from 'genkit';
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
    model: 'gemini-1.5-flash-latest', // We are targeting a specific model
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

// 1. Define our custom rotator model using the base `defineModel` utility.
const rotatorModel = defineModel(
  {
    name: 'googleai/gemini-2.5-flash-rotator',
    label: 'Google AI - Gemini 2.5 Flash Rotator',
    versions: ['gemini-2.5-flash'],
    supports: {
      media: false,
      multiturn: true,
      tools: false,
      systemRole: true,
      output: ['text', 'structured'],
    },
  },
  geminiRotatorModel
);


// 2. Initialize Genkit with the standard googleAI plugin and our custom model.
export const ai = genkit({
  plugins: [googleAI()],
  models: [rotatorModel], // Register our custom model
  flowStateStore: 'firebase',
  traceStore: 'firebase',
  flowStallTimeout: 60000,
});


// 3. Set our custom rotator model as the default for all subsequent calls.
ai.configure({
    model: 'googleai/gemini-2.5-flash-rotator',
});
