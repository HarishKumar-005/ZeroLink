
"use server";

import { convertNaturalLanguageToLogic } from "@/ai/flows/convert-natural-language-to-logic";
import { type Logic } from "@/types";
import { z } from "zod";

const LogicSchema = z.object({
  name: z.string(),
  trigger: z.object({
    type: z.enum(["all", "any"]),
    conditions: z.array(z.object({
      sensor: z.enum(["light", "temperature", "motion"]),
      operator: z.enum([">", "<", "=", "!="]),
      value: z.union([z.number(), z.boolean()])
    }))
  }),
  action: z.object({
    type: z.enum(["flashBackground", "vibrate", "log"]),
    payload: z.object({
        color: z.string().optional(),
        message: z.string().optional(),
        duration: z.number().optional()
    }).optional()
  })
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
        trigger: {
          type: "all",
          conditions: [
            { sensor: "temperature", operator: ">", value: 9999 } // Never triggers
          ]
        },
        action: { 
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
