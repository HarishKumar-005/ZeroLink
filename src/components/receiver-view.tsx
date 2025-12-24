
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QrScanner } from '@/components/qr-scanner';
import { LogicSimulator } from '@/components/logic-simulator';
import { type Logic, type SensorData } from '@/types';
import { useLogicRunner } from '@/hooks/use-logic-runner';
import { useLogicStorage } from '@/hooks/use-logic-storage';
import { SavedLogicList } from './saved-logic-list';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const LAST_LOGIC_KEY = 'zerolink-last-active-logic';

export function ReceiverView() {
  const [activeLogic, setActiveLogic] = useState<Logic | null>(null);
  const [sensorData, setSensorData] = useState<SensorData>({
    light: 250,
    temperature: 20,
    motion: false,
  });
  const [isFlashing, setIsFlashing] = useState(false);

  const { toast } = useToast();
  const { savedLogics, saveLogic, deleteLogic } = useLogicStorage();
  const { eventLog, clearLog } = useLogicRunner(activeLogic, sensorData);
  
  const handleLogicUpdate = (logicToSet: Logic | null) => {
    setActiveLogic(logicToSet);
    if (logicToSet && typeof window !== 'undefined') {
      localStorage.setItem(LAST_LOGIC_KEY, JSON.stringify(logicToSet));
    } else if (!logicToSet) {
      localStorage.removeItem(LAST_LOGIC_KEY);
    }
  };
  
  const handleLogicScanned = (scannedLogic: Logic) => {
    if (activeLogic && JSON.stringify(scannedLogic) === JSON.stringify(activeLogic)) {
      toast({ description: "This logic is already loaded."});
      return; 
    }
    handleLogicUpdate(scannedLogic);

    // Feedback on successful scan
    toast({
      title: "✅ Logic loaded successfully",
      description: `Loaded: ${scannedLogic.name}`,
    });
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 1000);
  };
  
  const handleLoadLogic = (logic: Logic) => {
    handleLogicUpdate(logic);
    toast({
        title: "Logic Loaded",
        description: `✅ Loaded: ${logic.name}`,
    });
  }

  const handleSaveCurrentLogic = async () => {
    if (activeLogic) {
      await saveLogic(activeLogic);
    }
  }
  
  const handleUnload = () => {
    handleLogicUpdate(null);
    clearLog();
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-6">
        {!activeLogic ? (
          <Card>
            <CardHeader>
              <CardTitle>Scan Logic</CardTitle>
              <CardDescription>
                Scan a ZeroLink QR code to load an automation rule.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QrScanner onScanSuccess={handleLogicScanned} />
               <p className="text-muted-foreground text-center italic mt-4">
                ❕ No automation logic loaded yet. Scan a QR code or select from saved logics.
               </p>
            </CardContent>
          </Card>
        ) : (
          <LogicSimulator
            logic={activeLogic}
            sensorData={sensorData}
            onSensorChange={setSensorData}
            onSave={handleSaveCurrentLogic}
            onClear={handleUnload}
            eventLog={eventLog}
            onClearLog={clearLog}
            className={cn('transition-all duration-300', isFlashing && 'border-green-500 border-4 shadow-lg')}
          />
        )}
      </div>
      <div>
        <SavedLogicList savedLogics={savedLogics} onLoad={handleLoadLogic} onDelete={deleteLogic} />
      </div>
    </div>
  );
}
