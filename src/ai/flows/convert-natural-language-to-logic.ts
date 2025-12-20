'use server';
/**
 * @fileOverview Converts natural language input into a logic JSON format.
 *
 * - convertNaturalLanguageToLogic - A function that converts natural language to logic.
 * - ConvertNaturalLanguageToLogicInput - The input type for the convertNaturalLanguageToLogic function.
 * - ConvertNaturalLanguageToLogicOutput - The return type for the convertNaturalLanguageToLogic function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ConvertNaturalLanguageToLogicInputSchema = z.object({
  naturalLanguage: z
    .string()
    .describe('The natural language description of the logical rule.'),
});
export type ConvertNaturalLanguageToLogicInput = z.infer<
  typeof ConvertNaturalLanguageToLogicInputSchema
>;

const ConvertNaturalLanguageToLogicOutputSchema = z.object({
  logicJson: z
    .string()
    .describe('The JSON representation of the logical rule.'),
});
export type ConvertNaturalLanguageToLogicOutput = z.infer<
  typeof ConvertNaturalLanguageToLogicOutputSchema
>;

export async function convertNaturalLanguageToLogic(
  input: ConvertNaturalLanguageToLogicInput
): Promise<ConvertNaturalLanguageToLogicOutput> {
  return convertNaturalLanguageToLogicFlow(input);
}

const prompt = ai.definePrompt({
  name: 'convertNaturalLanguageToLogicPrompt',
  input: {schema: ConvertNaturalLanguageToLogicInputSchema},
  output: {schema: ConvertNaturalLanguageToLogicOutputSchema},
  prompt: `You are the ZeroLink Logic Generator.

Given a natural language instruction from the user, output a JSON block in this exact format that can be executed in a sensor-based automation system. Return ONLY the JSON as a string.

--- JSON SCHEMA ---
{
  "name": "Short title of the logic",
  "trigger": {
    "type": "all" or "any",
    "conditions": [
      {
        "sensor": "'light' | 'temperature' | 'motion'",
        "operator": "'>' | '<' | '=' | '!='",
        "value": "number | boolean"
      }
    ]
  },
  "action": {
    "type": "'flashBackground' | 'vibrate' | 'log'",
    "payload": {
      "message"?: "Message to show",
      "color"?: "'red' | 'green' | 'blue' (only for flashBackground)",
      "duration"?: "number (milliseconds, for vibrate)"
    }
  }
}
--- END SCHEMA ---

RULES:
- "name" must be concise and readable.
- For triggers with multiple conditions, use "type": "all" if all must be true, and "any" if any one can be true.
- If a user says something like “when it’s dark,” translate to { "sensor": "light", "operator": "<", "value": 100 }.
- For the "motion" sensor, the value will always be a boolean (true for detected, false for not detected). The operator is usually "=".
- For demo visibility, prefer "flashBackground" or "vibrate" over just "log".
- Return ONLY the raw JSON object as a string in the 'logicJson' field. Do not include markdown or explanations.

EXAMPLE:
Input: "If temperature is over 40 and there's no motion, show a warning."
Output: { "name": "Overheat Warning", "trigger": { "type": "all", "conditions": [ { "sensor": "temperature", "operator": ">", "value": 40 }, { "sensor": "motion", "operator": "=", "value": false } ] }, "action": { "type": "flashBackground", "payload": { "color": "red", "message": "⚠️ Overheat Detected!" } } }

Now, convert the following natural language description.

Natural Language Description: {{{naturalLanguage}}}
  `,
});

const convertNaturalLanguageToLogicFlow = ai.defineFlow(
  {
    name: 'convertNaturalLanguageToLogicFlow',
    inputSchema: ConvertNaturalLanguageToLogicInputSchema,
    outputSchema: ConvertNaturalLanguageToLogicOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
