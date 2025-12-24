
"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogicInputForm } from '@/components/logic-input-form';
import { QrCodeDisplay } from '@/components/qr-code-display';
import { type Logic } from '@/types';
import { Skeleton } from './ui/skeleton';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { Moon, Flame } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

const FormSchema = z.object({
  naturalLanguage: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
});
type FormValues = z.infer<typeof FormSchema>;

export function SenderView() {
  const [generatedLogic, setGeneratedLogic] = useState<Logic | null>(null);
  const [rawJson, setRawJson] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const formRef = useRef<UseFormReturn<FormValues>>(null);

  const qrDisplayRef = useRef<HTMLDivElement>(null);
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (generatedLogic && qrDisplayRef.current) {
      qrDisplayRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [generatedLogic]);

  const handleFormSubmit = async (logic: Logic | null, error: string | null, rawJson: string | null) => {
    setIsLoading(false);
    setRawJson(rawJson);
    if (error) {
      setError(error);
      setGeneratedLogic(null);
    } else if (logic) {
      setError(null);
      setGeneratedLogic(logic);
    }
  };

  const handlePrefillClick = (prompt: string) => {
    if (formRef.current) {
      formRef.current.setValue('naturalLanguage', prompt);
      // Create a submit handler on the fly to pass to handleSubmit
      const submitHandler = formRef.current.handleSubmit((data) => {
        // Find the actual form element and trigger its submit event.
        // This is a bit of a workaround to trigger the LogicInputForm's own onSubmit.
        // A better long-term solution might involve a more tightly coupled state management.
        const formElement = document.querySelector('form');
        if (formElement) {
          formElement.requestSubmit();
        }
      });
      submitHandler();
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Logic</CardTitle>
        <CardDescription>
          Describe a trigger and an action in plain English. We'll convert it into a shareable logic link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <LogicInputForm 
          onSubmit={handleFormSubmit} 
          setIsLoading={setIsLoading} 
          formRef={formRef}
        />
        
        <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Or try a demo prompt:</Label>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handlePrefillClick("If it's dark and motion is detected, turn on a nightlight.")}>
                    <Moon className="mr-2 h-4 w-4"/> Nightlight trigger
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePrefillClick("If temperature is above 45 and light is high, show a heat warning.")}>
                    <Flame className="mr-2 h-4 w-4"/> Heat warning
                </Button>
            </div>
        </div>

        {isDevelopment && (
          <div className="flex items-center space-x-2">
            <Switch id="debug-mode" checked={showDebug} onCheckedChange={setShowDebug} />
            <Label htmlFor="debug-mode">Show Raw JSON Response</Label>
          </div>
        )}

        {error && <p className="text-sm text-destructive text-center">{error}</p>}

        {showDebug && rawJson && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Raw Gemini Response:</h4>
            <pre className="p-4 bg-muted rounded-md text-xs overflow-auto">
              <code>{rawJson}</code>
            </pre>
          </div>
        )}
        
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/2 mx-auto" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <Skeleton className="h-64 w-64 mx-auto rounded-lg" />
          </div>
        )}
        
        {generatedLogic && !isLoading && (
          <div className="mt-6" ref={qrDisplayRef}>
            <h3 className="text-lg font-semibold text-center mb-2">Your Logic Link is Ready</h3>
            <p className="text-sm text-center text-muted-foreground mb-4">
              Scan the QR code below on another device to load the logic.
            </p>
            <QrCodeDisplay logic={generatedLogic} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
