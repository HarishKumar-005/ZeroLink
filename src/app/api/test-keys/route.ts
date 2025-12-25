'use server';
/**
 * @fileoverview An API route to test all available Gemini API keys and report their status.
 */

import { NextResponse } from 'next/server';

interface KeyTestResult {
  key: string;
  status: 'active' | 'inactive' | 'error';
  message: string;
  isPermissionError?: boolean;
}

const maskKey = (key: string) => `...${key.slice(-6)}`;

/**
 * Discovers API keys from environment variables and removes duplicates.
 * @returns An array of unique API keys.
 */
function getApiKeys(): string[] {
  const allKeys = Object.keys(process.env)
    .filter((key) => key.startsWith('GEMINI_API_KEY'))
    .sort()
    .map((key) => process.env[key] as string)
    .filter(Boolean);
  
  return [...new Set(allKeys)];
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Handles GET requests to test the status of all Gemini API keys.
 */
export async function GET() {
  const keys = getApiKeys();

  if (keys.length === 0) {
    return NextResponse.json({ error: 'No GEMINI_API_KEY environment variables found.' }, { status: 500 });
  }
  
  const results: KeyTestResult[] = [];

  for (const apiKey of keys) {
    const masked = maskKey(apiKey);
    let result: KeyTestResult;
    try {
      const model = 'gemini-2.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "test" }] }],
        }),
      });

      if (response.ok) {
        result = { key: masked, status: 'active', message: 'OK' };
      } else {
        const errorBody = await response.json();
        const errorMessage = errorBody.error?.message || `HTTP ${response.status}`;
        const isPermissionError = errorBody.error?.status === 'PERMISSION_DENIED';
        
        result = { 
          key: masked, 
          status: isPermissionError ? 'inactive' : 'error', 
          message: errorMessage,
          isPermissionError
        };
      }

    } catch (error: any) {
      result = { key: masked, status: 'error', message: error.message || 'Network error or invalid response' };
    }
    results.push(result);
    // Wait for a short duration between each request to avoid hitting rate limits.
    // Increased to 2 seconds to be safer.
    await sleep(2000); 
  }


  return NextResponse.json({
    totalKeys: results.length,
    results,
  });
}
