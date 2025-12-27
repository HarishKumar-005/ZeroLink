
"use server";

import { LogicSchema, type Logic } from "@/lib/schema";
import { generateWithFallback } from '@/lib/gemini-key-rotator';

// Optimized system prompt - concise and structured to minimize tokens
const SYSTEM_PROMPT = `JSON compiler. Convert to:
{name:string,triggers:T|T[],actions:A|A[]}

T: {sensor:'temperature'|'light'|'motion'|'timeOfDay',operator:'>'|'<'|'='|'!=',value:number|boolean|'day'|'night'}
   OR {type:'all'|'any',conditions:T[]}

A: {type:'log'|'toggle'|'flashBackground'|'vibrate',payload?:{message?,device?:'light'|'fan'|'pump'|'siren',state?:'on'|'off',color?:string,duration?:number}}

Rules:
- Multiple conditions → triggers array
- AND/OR → nested groups
- motion: boolean
- timeOfDay: 'day'|'night'
- Return ONLY valid JSON, no markdown or explanation`;

export async function generateLogicAction(
  naturalLanguage: string
): Promise<{ logic: Logic | null; error: string | null; rawJson: string | null }> {
  if (!naturalLanguage.trim()) {
    return { logic: null, error: "Please enter a description for the logic.", rawJson: null };
  }
  
  // Input validation - prevent excessively long prompts
  if (naturalLanguage.length > 500) {
    return { 
      logic: null, 
      error: "Description is too long. Please keep it under 500 characters.", 
      rawJson: null 
    };
  }

  // Simple optimization: use concise prompt format
  const fullPrompt = `${SYSTEM_PROMPT}\n\nConvert: "${naturalLanguage}"`;

  try {
    const result = await generateWithFallback({
      prompt: fullPrompt,
      model: 'gemini-1.5-flash-latest',
    });

    if (!result.success) {
      console.error('[generateLogicAction] Key rotator failed:', result.error);
      return { 
          logic: null, 
          error: 'The AI service is currently unavailable. Please try again in a moment.', 
          rawJson: null 
      };
    }
    
    let rawJsonResult: string;
    try {
        const aiResponse = result.data as string;
        
        // Strip markdown code blocks if present
        const match = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        rawJsonResult = match ? match[1] : aiResponse.trim();
        
        // Additional cleanup - remove any leading/trailing non-JSON content
        const jsonMatch = rawJsonResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          rawJsonResult = jsonMatch[0];
        }
        
        const logicObject = JSON.parse(rawJsonResult);

        // Validate using Zod schema
        const validation = LogicSchema.safeParse(logicObject);

        if (!validation.success) {
            console.error('[generateLogicAction] Validation failed:', validation.error.flatten());
            const errorDetails = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
            return { 
                logic: null,
                error: `AI response has invalid structure: ${errorDetails}. Please try rephrasing.`,
                rawJson: rawJsonResult
            };
        }

        const validatedLogic = validation.data;
        
        // Normalize to array format for consistency
        const normalizedLogic: Logic = {
            name: validatedLogic.name,
            triggers: Array.isArray(validatedLogic.triggers) ? validatedLogic.triggers : [validatedLogic.triggers],
            actions: Array.isArray(validatedLogic.actions) ? validatedLogic.actions : [validatedLogic.actions],
        }

        return { logic: normalizedLogic, error: null, rawJson: rawJsonResult };

    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown parsing error';
      console.error('[generateLogicAction] Parse error:', errorMsg, "Raw:", result.data);
      return { 
          logic: null, 
          error: 'The AI returned invalid JSON. Please try rephrasing your request.',
          rawJson: result.data as string
      };
    }

  } catch (e) {
    console.error("[generateLogicAction] Unexpected error:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
    return { 
      logic: null, 
      error: `Failed to communicate with AI service: ${errorMessage}`,
      rawJson: null
    };
  }
}
