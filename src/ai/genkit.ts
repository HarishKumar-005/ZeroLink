import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI()],
  // Manually configured to use the gemini-2.5-flash model for all Genkit flows.
  model: 'googleai/gemini-2.5-flash',
});
