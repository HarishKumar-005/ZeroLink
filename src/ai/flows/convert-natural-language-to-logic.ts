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
  prompt: `You are a deterministic assistant. You must return ONLY a single valid JSON object that matches the following schema (no markdown, preamble, or extra text):

Top-level object:
{
  "name": string,
  "triggers": Trigger | Trigger[],
  "actions": Action | Action[]
}

Trigger can be:
1. A Simple Condition:
{
  "sensor": "temperature" | "light",
  "operator": ">" | "<" | "=" | "!=",
  "value": number
}
OR
{
  "sensor": "motion",
  "operator": "=" | "!=",
  "value": true | false
}
OR
{
  "sensor": "timeOfDay",
  "operator": "=" | "!=",
  "value": "day" | "night"
}

2. A Group Condition:
{
  "type": "all" | "any",
  "conditions": [ Trigger, ... ] // recursive
}

Action can be:
{
  "type": "log",
  "payload": { "message": string }
}
OR
{
  "type": "toggle",
  "payload": { "device": "fan" | "light" | "pump" | "siren", "state": "on" | "off" }
}
OR
{
  "type": "flashBackground",
  "payload": {}
}

📌 Rules:
- Accept multiple rules in input → produce \`triggers\` as an array.
- Support nested conditions using \`type: "all"\` for AND and \`type: "any"\` for OR logic.
- Always return a top-level \`"name"\` field summarizing the rule(s).
- Only use allowed sensors, actions, and field names — strict match.
- Use \`true\`/\`false\` for \`motion\`, and \`"day"\`/\`"night"\` for \`timeOfDay\`.
- No extra fields, no explanations.

💡 Few-shot Examples:

1️⃣ Input:
"If temperature > 35 and light < 20 then water the pump."
Output:
{"name":"Heat + low light trigger","triggers":{"type":"all","conditions":[{"sensor":"temperature","operator":">","value":35},{"sensor":"light","operator":"<","value":20}]},"actions":{"type":"toggle","payload":{"device":"pump","state":"on"}}}

2️⃣ Input:
"If motion is detected and timeOfDay is night, turn on the light."
Output:
{"name":"Night motion light","triggers":{"type":"all","conditions":[{"sensor":"motion","operator":"=","value":true},{"sensor":"timeOfDay","operator":"=","value":"night"}]},"actions":{"type":"toggle","payload":{"device":"light","state":"on"}}}

3️⃣ Input:
"If temperature > 35 then water the pump. If motion is detected and it's night, turn on the light."
Output:
{"name":"Pump and light logic","triggers":[{"sensor":"temperature","operator":">","value":35},{"type":"all","conditions":[{"sensor":"motion","operator":"=","value":true},{"sensor":"timeOfDay","operator":"=","value":"night"}]}],"actions":[{"type":"toggle","payload":{"device":"pump","state":"on"}},{"type":"toggle","payload":{"device":"light","state":"on"}}]}

Return ONLY the final JSON object. No extra formatting, no text, no comments.

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
