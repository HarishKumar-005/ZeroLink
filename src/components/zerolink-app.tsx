
"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SenderView } from '@/components/sender-view';
import { ReceiverView } from '@/components/receiver-view';
import { type Logic } from '@/types';
import { Zap } from 'lucide-react';

export function ZeroLinkApp() {
  const [logic, setLogic] = useState<Logic | null>(null);
  const [activeTab, setActiveTab] = useState('sender');

  const handleLogicGenerated = (newLogic: Logic | null) => {
    setLogic(newLogic);
  };

  const handleLogicLoaded = (loadedLogic: Logic | null) => {
    setLogic(loadedLogic);
    if(loadedLogic) {
        setActiveTab('receiver');
    }
  };

  return (
    <div className="w-full max-w-4xl mt-8">
      <header className="text-center mb-8">
        <h1 className="text-5xl font-bold font-headline flex items-center justify-center gap-3">
          <Zap className="w-12 h-12 text-primary" />
          ZeroLink
        </h1>
        <p className="text-muted-foreground mt-2">
          Instantly create and share automation logic with a flash.
        </p>
      </header>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sender">Sender</TabsTrigger>
          <TabsTrigger value="receiver">Receiver</TabsTrigger>
        </TabsList>
        <TabsContent value="sender">
          <SenderView onLogicGenerated={handleLogicGenerated} />
        </TabsContent>
        <TabsContent value="receiver">
          <ReceiverView initialLogic={logic} onLogicLoad={handleLogicLoaded} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
