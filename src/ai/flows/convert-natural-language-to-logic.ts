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
  prompt: `You are an AI assistant for the ZeroLink automation project.

Your job is to convert natural language into a valid JSON automation logic block.

⚠️ Output Format Rules:
- Return ONLY a single JSON object with the structure:
  {
    "name": string,
    "trigger": {
      "type": "all" | "any",
      "conditions": [
        {
          "sensor": "temperature" | "light" | "motion",
          "operator": ">" | "<" | "=" | "!=",
          "value": number | boolean
        }
      ]
    },
    "action": {
      "type": "log" | "flashBackground" | "vibrate",
      "payload"?: {
        "message"?: string,
        "color"?: string,
        "duration"?: number
      }
    }
  }

❌ Do NOT return any explanation or markdown.
✅ Output ONLY raw JSON in the 'logicJson' field.

- For the "motion" sensor, the value must be a boolean (true for detected, false for not detected).
- For triggers with multiple conditions, use "type": "all" if all must be true, and "any" if any one can be true.

💬 Example Input: "If the temperature is more than 30°C, vibrate."
✅ Expected Output in 'logicJson' field:
{
  "name": "Heat Alert",
  "trigger": {
    "type": "all",
    "conditions": [
      { "sensor": "temperature", "operator": ">", "value": 30 }
    ]
  },
  "action": {
    "type": "vibrate"
  }
}

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
