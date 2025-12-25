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
  prompt: `You are ZeroLink Logic Planner Agent.

Your job is to convert natural language goals (like "Turn on fan if hot") into precise logic in structured JSON format.

You must follow the schema and output only a single valid JSON object — no extra text, no comments, no markdown. This output will be parsed and executed directly by a logic engine.

Rules:
- Only use known sensors: "temperature", "light", "motion"
- Only use operators: ">", "<", "=", "!="
- Use boolean \`true\`/\`false\` for motion sensor
- Action types: "log", "toggle", "flashBackground"
- Devices (for toggle): "fan", "light", "pump", "siren"
- Conditions can be simple or nested using "all"/"any" logic

Schema:
- "name": string
- "trigger": recursive trigger structure
- "action": includes action.type and payload

Nested Triggers:
A trigger can be:
1. A simple condition: { sensor, operator, value }
2. A group: { type: "all" | "any", conditions: [triggers...] }

Output a single JSON object that matches this logic.

Few-shot Examples:
---

Input:
"If temperature is above 30, flash background."

Output:
{
  "name": "Flash when hot",
  "trigger": {
    "sensor": "temperature",
    "operator": ">",
    "value": 30
  },
  "action": {
    "type": "flashBackground",
    "payload": {}
  }
}

---

Input:
"Turn on the pump if it's hot and there's motion."

Output:
{
  "name": "Pump if hot and motion",
  "trigger": {
    "type": "all",
    "conditions": [
      { "sensor": "temperature", "operator": ">", "value": 30 },
      { "sensor": "motion", "operator": "=", "value": true }
    ]
  },
  "action": {
    "type": "toggle",
    "payload": {
      "device": "pump",
      "state": "on"
    }
  }
}

---

Input:
"If motion is detected OR (temperature > 35 AND light < 50), turn on fan."

Output:
{
  "name": "Smart fan activation",
  "trigger": {
    "type": "any",
    "conditions": [
      { "sensor": "motion", "operator": "=", "value": true },
      {
        "type": "all",
        "conditions": [
          { "sensor": "temperature", "operator": ">", "value": 35 },
          { "sensor": "light", "operator": "<", "value": 50 }
        ]
      }
    ]
  },
  "action": {
    "type": "toggle",
    "payload": {
      "device": "fan",
      "state": "on"
    }
  }
}

---

Return only a single JSON object matching the schema. Do not include quotes or preambles.

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
