
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

// The user's natural language input will be injected here.
{{naturalLanguage}}
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

    const jsonSchema = zodToJsonSchema(LogicSchema, "LogicSchema");

    // Call the Gemini API using our key rotator
    const result = await generateWithFallback({
      prompt,
      responseJsonSchema: jsonSchema,
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
    
    return { logic: validationResult.data as Logic, error: null, rawJson: rawJsonResult };

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
