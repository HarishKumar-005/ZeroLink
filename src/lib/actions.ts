
"use server";

import { generateWithFallback } from "@/lib/gemini-key-rotator";
import { type Logic } from "@/types";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const BaseConditionSchema = z.object({
  sensor: z.enum(["light", "temperature", "motion", "timeOfDay"]),
  operator: z.enum([">", "<", "=", "!="]),
  value: z.union([z.number(), z.boolean(), z.string()])
});

const TriggerSchema: z.ZodType<any> = z.lazy(() => 
  z.union([
    BaseConditionSchema,
    z.object({
      type: z.enum(["all", "any"]),
      conditions: z.array(TriggerSchema),
    })
  ])
);

const ActionSchema = z.object({
    type: z.enum(["flashBackground", "vibrate", "log", "toggle"]),
    payload: z.object({
        // Common
        message: z.string().optional(),
        
        // For flashBackground
        color: z.string().optional(),
        duration: z.number().optional(),

        // For toggle
        device: z.enum(["light", "fan", "pump", "siren"]).optional(),
        state: z.enum(["on", "off"]).optional(),

    }).optional()
  });

const LogicSchema = z.object({
  name: z.string(),
  triggers: z.union([TriggerSchema, z.array(TriggerSchema)]),
  actions: z.union([ActionSchema, z.array(ActionSchema)]),
});

// This is the prompt that will be sent to the Gemini API.
const LOGIC_GENERATION_PROMPT_TEMPLATE = `You are a deterministic assistant. You must return ONLY a single valid JSON object that matches the following schema (no markdown, preamble, or extra text):

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
- If the user's request is ambiguous or doesn't fit the schema, default to a simple log action: { "name": "User Query Log", "triggers": [], "actions": [{ "type": "log", "payload": { "message": "User query: [original user input]" } }] }
- Accept multiple rules in input → produce \`triggers\` and \`actions\` as arrays.
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

Natural Language Description: {{naturalLanguage}}
`;


export async function generateLogicAction(
  naturalLanguage: string
): Promise<{ logic: Logic | null; error: string | null; rawJson: string | null }> {
  if (!naturalLanguage.trim()) {
    return { logic: null, error: "Please enter a description for the logic.", rawJson: null };
  }

  let rawJsonResult: string | null = null;
  try {
    
    // Construct the full prompt
    const prompt = LOGIC_GENERATION_PROMPT_TEMPLATE.replace('{{naturalLanguage}}', naturalLanguage);

    const fullJsonSchema = zodToJsonSchema(LogicSchema, "LogicSchema");
    
    // The Gemini API does not support top-level $schema, definitions, or $ref properties.
    // We need to create a "clean" version of the schema for the API.
    const apiClientSchema = {
      ...fullJsonSchema,
    };
    delete (apiClientSchema as any).$schema;
    delete (apiClientSchema as any).definitions;
    delete (apiClientSchema as any).$ref;


    // Call the Gemini API using our key rotator
    const result = await generateWithFallback({
      prompt,
      responseJsonSchema: apiClientSchema,
      responseMimeType: 'application/json',
    });

    if (!result.success) {
      console.error("Gemini fallback error:", result.error);
      return { logic: null, error: result.error, rawJson: null };
    }

    const logicObject = result.data;
    rawJsonResult = JSON.stringify(logicObject, null, 2);

    // Validate the structure of the AI output
    const validationResult = LogicSchema.safeParse(logicObject);

    if (!validationResult.success) {
      console.error("Zod validation failed:", validationResult.error.flatten());
      return { 
        logic: null, 
        error: "AI returned an invalid logic structure. Please try rephrasing your request.", 
        rawJson: rawJsonResult 
      };
    }
    
    // Ensure triggers and actions are always arrays for consistent processing
    const singleTrigger = validationResult.data.triggers;
    const singleAction = validationResult.data.actions;

    const logicWithArrays: Logic = {
        ...validationResult.data,
        triggers: Array.isArray(singleTrigger) ? singleTrigger : [singleTrigger],
        actions: Array.isArray(singleAction) ? singleAction : [singleAction]
    };

    return { logic: logicWithArrays, error: null, rawJson: rawJsonResult };

  } catch (e) {
    console.error("Error generating logic:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
    return { 
      logic: null, 
      error: `Failed to generate logic. The AI may have returned an unexpected format. Details: ${errorMessage}`,
      rawJson: rawJsonResult
    };
  }
}

