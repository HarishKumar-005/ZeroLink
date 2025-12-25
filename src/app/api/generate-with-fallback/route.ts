/**
 * @fileoverview A Next.js API route to generate content using the Gemini key rotator.
 */
import { NextResponse } from 'next/server';
import { generateWithFallback, getKeyStatus } from '@/lib/gemini-key-rotator';

export const runtime = 'nodejs'; // Ensure this runs on the Node.js runtime

/**
 * Handles GET requests to check the status of the API keys.
 */
export async function GET() {
  const keyStatus = await getKeyStatus();
  return NextResponse.json(keyStatus);
}

/**
 * Handles POST requests to generate content.
 * Expects a JSON body with { prompt, responseJsonSchema, model }.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, responseJsonSchema, model } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const result = await generateWithFallback({
      prompt,
      model,
      responseJsonSchema,
      responseMimeType: responseJsonSchema ? 'application/json' : undefined,
    });

    if (result.success) {
      return NextResponse.json(result.data);
    } else {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
  } catch (error) {
    console.error('[API Route Error]', error);
    let message = 'An unknown error occurred';
    if (error instanceof Error) message = error.message;
    if (error instanceof SyntaxError) message = 'Invalid JSON in request body';
    
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
