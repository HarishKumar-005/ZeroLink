
"use server";

import { generateWithFallback } from "@/lib/gemini-key-rotator";
import { type Logic, Trigger, Action } from "@/types";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const BaseConditionSchema = z.object({
  sensor: z.enum(["light", "temperature", "motion", "timeOfDay"]),
  operator: z.enum([">", "<", "=", "!="]),
  value: z.union([z.number(), z.boolean(), z.string()])
});

const TriggerSchema: z.ZodType<Trigger> = z.lazy(() => 
  z.union([
    BaseConditionSchema,
    z.object({
      type: z.enum(["all", "any"]),
      conditions: z.array(TriggerSchema),
    })
  ])
);

const ActionSchema: z.ZodType<Action> = z.object({
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
const LOGIC_GENERATION_PROMPT_TEMPLATE = `You are a logic planner assistant for a smart automation system.

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
    
    return { logic: validationResult.data, error: null, rawJson: rawJsonResult };

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

