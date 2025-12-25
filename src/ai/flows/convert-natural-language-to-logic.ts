
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
  prompt: `You are a logic planner assistant for a smart automation system.

You must convert natural language instructions into a structured JSON object called \`Logic\`.

🧠 Logic Structure:

A \`Logic\` object has:
- \`name\`: string (short title of the rule)
- \`triggers\`: either a single \`Trigger\`, an array of \`Trigger\`, or a recursive group using \`type: "all" | "any"\` and \`conditions: Trigger[]\`
- \`actions\`: either a single \`Action\` or an array of \`Action\`

A \`Trigger\` is one of:
- \`{ sensor: "temperature" | "light" | "motion" | "timeOfDay", operator: ">" | "<" | "=" | "!=", value: number | boolean | "day" | "night" }\`
- Or a group trigger: \`{ type: "all" | "any", conditions: Trigger[] }\`

An \`Action\` is one of:
- \`{ type: "log", payload: { message: string } }\`
- \`{ type: "toggle", payload: { device: "light" | "fan" | "pump" | "siren", state: "on" | "off" } }\`
- \`{ type: "flashBackground", payload: {} }\`

🚫 Do not invent new sensor names or devices.

📌 Multiple sentences = multiple rules → use \`triggers\` as an array.

Return ONLY valid JSON. No markdown, no explanation, no preamble.

---

### ✨ Few-shot Examples:

**Input:**
If the temperature is above 30, turn on the fan.

**Output:**
{
  "name": "Cool Room",
  "triggers": {
    "sensor": "temperature",
    "operator": ">",
    "value": 30
  },
  "actions": {
    "type": "toggle",
    "payload": { "device": "fan", "state": "on" }
  }
}

---

**Input:**
If it's night and motion is detected, turn on the light.

**Output:**
{
  "name": "Night Light",
  "triggers": {
    "type": "all",
    "conditions": [
      { "sensor": "timeOfDay", "operator": "=", "value": "night" },
      { "sensor": "motion", "operator": "=", "value": true }
    ]
  },
  "actions": {
    "type": "toggle",
    "payload": { "device": "light", "state": "on" }
  }
}

---

**Input:**
If light is below 20, flash the screen. If motion is detected, turn on the siren.

**Output:**
{
  "name": "Multi Alert",
  "triggers": [
    {
      "sensor": "light",
      "operator": "<",
      "value": 20
    },
    {
      "sensor": "motion",
      "operator": "=",
      "value": true
    }
  ],
  "actions": [
    {
      "type": "flashBackground",
      "payload": {}
    },
    {
      "type": "toggle",
      "payload": { "device": "siren", "state": "on" }
    }
  ]
}

---

Return ONLY the final JSON that matches the schema. No other text.

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
