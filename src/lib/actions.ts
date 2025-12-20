"use server";

import { convertNaturalLanguageToLogic } from "@/ai/flows/convert-natural-language-to-logic";
import { type Logic } from "@/types";

export async function generateLogicAction(
  naturalLanguage: string
): Promise<{ logic: Logic | null; error: string | null }> {
  if (!naturalLanguage.trim()) {
    return { logic: null, error: "Please enter a description for the logic." };
  }

  try {
    const result = await convertNaturalLanguageToLogic({ naturalLanguage });
    
    const logicObject = JSON.parse(result.logicJson);

    // Basic validation, in a real app you'd use a schema library like Zod
    if (!logicObject.name || !logicObject.trigger || !logicObject.action) {
        throw new Error("AI returned an invalid logic structure.");
    }
    
    return { logic: logicObject as Logic, error: null };
  } catch (e) {
    console.error("Error generating logic:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
    return { logic: null, error: `Failed to generate logic. The AI may have returned an unexpected format. Details: ${errorMessage}` };
  }
}
