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
  prompt: `You are an expert AI that converts natural language into a specific JSON format for a logic automation engine. You must return ONLY the JSON as a string.

  Your output must be a JSON object with the following structure:
  - "name": A short, descriptive name for the rule (e.g., "High Temp Alert").
  - "trigger": An object that defines what causes the rule to fire.
  - "action": An object that defines what happens when the rule fires.

  --- JSON SCHEMA ---
  {
    "name": "string",
    "trigger": {
      "type": "'all' or 'any'",
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
        // for flashBackground
        "color"?: "string (CSS color)",
        // for vibrate
        "duration"?: "number (milliseconds)",
        // for log
        "message"?: "string"
      }
    }
  }
  --- END SCHEMA ---

  - For triggers with multiple conditions, use "all" if all must be true, and "any" if any can be true.
  - For the "motion" sensor, the value will always be a boolean (true for detected, false for not detected).
  - The "operator" for motion is typically "=".

  Example 1:
  Input: "If the temperature is above 35°C, flash red."
  Output: { "name": "High Temp Alert", "trigger": { "type": "all", "conditions": [ { "sensor": "temperature", "operator": ">", "value": 35 } ] }, "action": { "type": "flashBackground", "payload": { "color": "red" } } }

  Example 2:
  Input: "when motion is detected and the light level is below 100, log 'Intruder Alert'"
  Output: { "name": "Intruder Alert", "trigger": { "type": "all", "conditions": [ { "sensor": "motion", "operator": "=", "value": true }, { "sensor": "light", "operator": "<", "value": 100 } ] }, "action": { "type": "log", "payload": { "message": "Intruder Alert" } } }

  Now, convert the following natural language description. Return only the JSON object as a string in the 'logicJson' field.

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
