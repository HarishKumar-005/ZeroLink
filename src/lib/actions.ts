
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
): Promise<{ logic: Logic | null; error: string | null }> {
  if (!naturalLanguage.trim()) {
    return { logic: null, error: "Please enter a description for the logic." };
  }

  try {
    const result = await convertNaturalLanguageToLogic({ naturalLanguage });
    
    const logicObject = JSON.parse(result.logicJson);

    // Validate the structure of the AI output
    const validationResult = LogicSchema.safeParse(logicObject);

    if (!validationResult.success) {
      console.error("Zod validation failed:", validationResult.error.flatten());
      throw new Error("AI returned an invalid logic structure.");
    }
    
    return { logic: validationResult.data as Logic, error: null };
  } catch (e) {
    console.error("Error generating logic:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
    return { logic: null, error: `Failed to generate logic. The AI may have returned an unexpected format. Details: ${errorMessage}` };
  }
}
