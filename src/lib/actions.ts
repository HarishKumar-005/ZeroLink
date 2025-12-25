
"use server";

import { type Logic } from "@/types";
import { convertNaturalLanguageToLogic } from "@/ai/flows/convert-natural-language-to-logic";

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

    // The flow now returns a stringified JSON. We need to parse it.
    const logicObject = JSON.parse(result.logicJson);

    // Although the flow should return the correct schema, we can still validate it here as a safeguard.
    // For now, we trust the flow which has its own output schema validation.
    
    // The AI might return a single trigger/action, but our runner expects arrays.
    // To be safe, let's normalize it here.
    const normalizedLogic: Logic = {
        name: logicObject.name,
        triggers: Array.isArray(logicObject.triggers) ? logicObject.triggers : [logicObject.triggers],
        actions: Array.isArray(logicObject.actions) ? logicObject.actions : [logicObject.actions],
    }

    return { logic: normalizedLogic, error: null, rawJson: rawJsonResult };

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
