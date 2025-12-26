
"use server";

import { type Logic } from "@/types";

export async function generateLogicAction(
  naturalLanguage: string
): Promise<{ logic: Logic | null; error: string | null; rawJson: string | null }> {
  if (!naturalLanguage.trim()) {
    return { logic: null, error: "Please enter a description for the logic.", rawJson: null };
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/generate-logic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: naturalLanguage }),
    });

    const result = await response.json();

    if (!response.ok) {
        // Forward the user-friendly error from the API route
        return { logic: null, error: result.error || 'An unknown error occurred.', rawJson: null };
    }

    // The API now returns the validated logic and rawJson in a specific structure
    const logicObject = result.logic;
    const rawJsonResult = result.rawJson;

    // The API route now handles validation and normalization. 
    // We can trust the structure if the request was successful.
    const normalizedLogic: Logic = {
        name: logicObject.name,
        // Ensure triggers/actions are always arrays for consistent frontend handling.
        triggers: Array.isArray(logicObject.triggers) ? logicObject.triggers : [logicObject.triggers],
        actions: Array.isArray(logicObject.actions) ? logicObject.actions : [logicObject.actions],
    }

    return { logic: normalizedLogic, error: null, rawJson: rawJsonResult };

  } catch (e) {
    console.error("Error calling generate-logic API:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
    return { 
      logic: null, 
      error: `Failed to communicate with the generation service. Details: ${errorMessage}`,
      rawJson: null
    };
  }
}
