
"use client";

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SenderView } from '@/components/sender-view';
import { ReceiverView } from '@/components/receiver-view';
import { type Logic } from '@/types';
import { Zap, Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';

export function ZeroLinkApp() {
  const [activeTab, setActiveTab] = useState('sender');
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  const handleLogicGenerated = () => {
    // This function can be used to switch tabs or other side effects if needed.
  };

  const handleLogicLoaded = (loadedLogic: Logic | null) => {
    if (loadedLogic) {
      setActiveTab('receiver');
    }
  };

  return (
    <div className="w-full max-w-4xl mt-8">
      <header className="text-center mb-8 relative">
        <h1 className="text-5xl font-bold font-headline flex items-center justify-center gap-3">
          <Zap className="w-12 h-12 text-primary" />
          ZeroLink
        </h1>
        <p className="text-muted-foreground mt-2">
          Instantly create and share automation logic with a flash.
        </p>
         <div className="absolute top-0 right-0">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            <Sun className="h-6 w-6 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-6 w-6 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
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
          <ReceiverView onLogicLoad={handleLogicLoaded} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
