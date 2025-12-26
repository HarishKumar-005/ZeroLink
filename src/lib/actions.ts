
"use server";

import { LogicSchema, type Logic } from "@/lib/schema";
import { generateWithFallback } from '@/lib/gemini-key-rotator';

const SYSTEM_PROMPT = `You are a logic compiler. Convert user instructions into JSON only.
Return a single JSON object matching this shape:

{
  name: string,
  triggers: Trigger | Trigger[],
  actions: Action | Action[]
}

Trigger:
- Simple: { sensor: 'temperature'|'light'|'motion'|'timeOfDay', operator: '>'|'<'|'='|'!=', value: number|boolean|'day'|'night' }
- Group: { type: 'all'|'any', conditions: Trigger[] }

Action:
- { type: 'log', payload: { message: string } }
- { type: 'toggle', payload: { device: 'light'|'fan'|'pump'|'siren', state: 'on'|'off' } }
- { type: 'flashBackground', payload: {} }

Rules:
- Multiple sentences → triggers array
- Nested AND/OR → recursive groups
- motion uses boolean
- timeOfDay uses 'day' or 'night'
- Return ONLY JSON. No markdown. No explanation.`;

export async function generateLogicAction(
  naturalLanguage: string
): Promise<{ logic: Logic | null; error: string | null; rawJson: string | null }> {
  if (!naturalLanguage.trim()) {
    return { logic: null, error: "Please enter a description for the logic.", rawJson: null };
  }

  const fullPrompt = `${SYSTEM_PROMPT}\n\nUser Prompt: "${naturalLanguage}"`;

  try {
    const result = await generateWithFallback({
      prompt: fullPrompt,
      model: 'gemini-1.5-flash-latest',
    });

    if (!result.success) {
      console.error('[generateLogicAction] Key rotator failed:', result.error);
      return { 
          logic: null, 
          error: 'The AI service is currently unavailable or rate-limited.', 
          rawJson: null 
      };
    }
    
    let rawJsonResult: string;
    try {
        const aiResponse = result.data as string;
        // AI might wrap the JSON in markdown, so we need to extract it.
        const match = aiResponse.match(/```(json)?\s*([\s\S]*?)\s*```/);
        rawJsonResult = match ? match[2] : aiResponse;
        
        const logicObject = JSON.parse(rawJsonResult);

        // Zod is the source of truth. Validate the AI's output.
        const validation = LogicSchema.safeParse(logicObject);

        if (!validation.success) {
            console.error('[generateLogicAction] Zod validation failed:', validation.error.flatten());
            return { 
                logic: null,
                error: "The AI returned a response with an invalid structure. Please try rephrasing your request.",
                rawJson: rawJsonResult
            };
        }

        const validatedLogic = validation.data;
        const normalizedLogic: Logic = {
            name: validatedLogic.name,
            triggers: Array.isArray(validatedLogic.triggers) ? validatedLogic.triggers : [validatedLogic.triggers],
            actions: Array.isArray(validatedLogic.actions) ? validatedLogic.actions : [validatedLogic.actions],
        }

        return { logic: normalizedLogic, error: null, rawJson: rawJsonResult };

    } catch (e) {
      console.error('[generateLogicAction] JSON parsing/validation error:', e, "Raw response:", result.data);
      return { 
          logic: null, 
          error: 'The AI returned invalid JSON. Please try again.',
          rawJson: result.data as string
      };
    }

  } catch (e) {
    console.error("[generateLogicAction] General error:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
    return { 
      logic: null, 
      error: `Failed to communicate with the generation service. Details: ${errorMessage}`,
      rawJson: null
    };
  }
}
