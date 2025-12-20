"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogicInputForm } from '@/components/logic-input-form';
import { QrCodeDisplay } from '@/components/qr-code-display';
import { type Logic } from '@/types';
import { Skeleton } from './ui/skeleton';

interface SenderViewProps {
  onLogicGenerated: (logic: Logic) => void;
}

export function SenderView({ onLogicGenerated }: SenderViewProps) {
  const [generatedLogic, setGeneratedLogic] = useState<Logic | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = async (logic: Logic | null, error: string | null) => {
    setIsLoading(false);
    if (error) {
      setError(error);
      setGeneratedLogic(null);
    } else if (logic) {
      setError(null);
      setGeneratedLogic(logic);
      onLogicGenerated(logic);
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
        <LogicInputForm onSubmit={handleFormSubmit} setIsLoading={setIsLoading} />
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/2 mx-auto" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <Skeleton className="h-64 w-64 mx-auto rounded-lg" />
          </div>
        )}
        {error && <p className="text-center text-destructive">{error}</p>}
        {generatedLogic && !isLoading && (
          <div className="mt-6">
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
