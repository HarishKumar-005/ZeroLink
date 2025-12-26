
'use server';

import { NextResponse } from 'next/server';
import { generateWithFallback } from '@/lib/gemini-key-rotator';
import { z } from 'zod';

// Define a robust schema for validating the AI's output.
// This matches the flexible structure of single or multiple triggers/actions.

const BaseConditionSchema = z.object({
  sensor: z.enum(['light', 'temperature', 'motion', 'timeOfDay']),
  operator: z.enum(['>', '<', '=', '!=']),
  value: z.union([z.number(), z.boolean(), z.string()]),
});

const TriggerSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    BaseConditionSchema,
    z.object({
      type: z.enum(['all', 'any']),
      conditions: z.array(TriggerSchema),
    }),
  ])
);

const ActionSchema = z.object({
  type: z.enum(['flashBackground', 'vibrate', 'log', 'toggle']),
  payload: z.object({
    message: z.string().optional(),
    color: z.string().optional(),
    duration: z.number().optional(),
    device: z.enum(['light', 'fan', 'pump', 'siren']).optional(),
    state: z.enum(['on', 'off']).optional(),
  }).optional(),
});

export const LogicSchema = z.object({
  name: z.string(),
  triggers: z.union([TriggerSchema, z.array(TriggerSchema)]),
  actions: z.union([ActionSchema, z.array(ActionSchema)]),
});

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

/**
 * Handles POST requests to generate logic from natural language.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt: userPrompt } = body;

    if (!userPrompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const fullPrompt = `${SYSTEM_PROMPT}\n\nUser Prompt: "${userPrompt}"`;
    
    // Call the existing, robust key rotator
    const result = await generateWithFallback({
      prompt: fullPrompt,
      model: 'gemini-1.5-flash-latest', // Use the intended model
    });

    if (!result.success) {
      console.error('[generate-logic API] Key rotator failed:', result.error);
      return NextResponse.json({ error: 'The AI service is currently unavailable or rate-limited.' }, { status: 503 });
    }

    let rawJsonResult: string;
    try {
        // AI might wrap the JSON in markdown, so we need to extract it.
        const match = (result.data as string).match(/```(json)?\s*([\s\S]*?)\s*```/);
        rawJsonResult = match ? match[2] : (result.data as string);
        const logicObject = JSON.parse(rawJsonResult);

        // Zod is the source of truth. Validate the AI's output.
        const validation = LogicSchema.safeParse(logicObject);

        if (!validation.success) {
            console.error('[generate-logic API] Zod validation failed:', validation.error.flatten());
            return NextResponse.json(
                { 
                    error: "The AI returned a response with an invalid structure. Please try rephrasing your request.",
                    details: validation.error.flatten(),
                }, 
                { status: 400 }
            );
        }

        return NextResponse.json({ logic: validation.data, rawJson: rawJsonResult });

    } catch (e) {
      console.error('[generate-logic API] JSON parsing error:', e, "Raw response:", result.data);
      return NextResponse.json({ error: 'The AI returned invalid JSON. Please try again.' }, { status: 500 });
    }

  } catch (error) {
    console.error('[generate-logic API] General error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred on the server.' }, { status: 500 });
  }
}
