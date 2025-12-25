
"use server";

import { convertNaturalLanguageToLogic } from "@/ai/flows/convert-natural-language-to-logic";
import { type Logic } from "@/types";
import { z } from "zod";

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


export async function generateLogicAction(
  naturalLanguage: string
): Promise<{ logic: Logic | null; error: string | null; rawJson: string | null }> {
  if (!naturalLanguage.trim()) {
    return { logic: null, error: "Please enter a description for the logic.", rawJson: null };
  }

  let rawJsonResult: string | null = null;
  try {
    const result = await convertNaturalLanguageToLogic({ naturalLanguage });
    rawJsonResult = result.logicJson;
    
    const logicObject = JSON.parse(rawJsonResult);

    // Validate the structure of the AI output
    const validationResult = LogicSchema.safeParse(logicObject);

    if (!validationResult.success) {
      console.error("Zod validation failed:", validationResult.error.flatten());
      const fallbackLogic: Logic = {
        name: "Fallback Logic",
        triggers: {
          type: "all",
          conditions: [
            { sensor: "temperature", operator: ">", value: 9999 } // Never triggers
          ]
        },
        actions: { 
          type: "log", 
          payload: { message: "AI returned invalid structure." } 
        }
      };
      return { 
        logic: null, 
        error: "AI returned an invalid logic structure. Please try rephrasing your request.", 
        rawJson: rawJsonResult 
      };
    }
    
    // The type assertion here is now safer because of the Zod validation
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
