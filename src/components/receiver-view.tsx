
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QrScanner } from '@/components/qr-scanner';
import { LogicSimulator } from '@/components/logic-simulator';
import { type Logic, type SensorData } from '@/types';
import { useLogicRunner } from '@/hooks/use-logic-runner';
import { useLogicStorage } from '@/hooks/use-logic-storage';
import { SavedLogicList } from './saved-logic-list';
import { useToast } from '@/hooks/use-toast';

interface ReceiverViewProps {
  onLogicLoad: (logic: Logic | null) => void;
}

const LAST_LOGIC_KEY = 'zerolink-last-active-logic';

export function ReceiverView({ onLogicLoad }: ReceiverViewProps) {
  const [activeLogic, setActiveLogic] = useState<Logic | null>(null);
  const [sensorData, setSensorData] = useState<SensorData>({
    light: 250,
    temperature: 20,
    motion: false,
  });

  const { toast } = useToast();
  const { savedLogics, saveLogic, deleteLogic } = useLogicStorage();
  const { eventLog, clearLog } = useLogicRunner(activeLogic, sensorData);
  
  // Auto-load previously scanned logic on mount
  useEffect(() => {
    if (!activeLogic && typeof window !== 'undefined') {
      const savedLogicJson = localStorage.getItem(LAST_LOGIC_KEY);
      if (savedLogicJson) {
        try {
          const savedLogic = JSON.parse(savedLogicJson) as Logic;
          setActiveLogic(savedLogic);
          onLogicLoad(savedLogic);
          toast({
            title: "Logic Loaded",
            description: `✅ Loaded previously saved automation: ${savedLogic.name}`,
          });
        } catch (e) {
          console.error("Failed to parse saved logic", e);
          localStorage.removeItem(LAST_LOGIC_KEY);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleLogicUpdate = (logicToSet: Logic | null) => {
    setActiveLogic(logicToSet);
    onLogicLoad(logicToSet);
    if (logicToSet && typeof window !== 'undefined') {
      localStorage.setItem(LAST_LOGIC_KEY, JSON.stringify(logicToSet));
    } else if (!logicToSet) {
      localStorage.removeItem(LAST_LOGIC_KEY);
    }
  };
  
  const handleLogicScanned = (scannedLogic: Logic) => {
    // Prevent duplicate scans of the same logic
    if (activeLogic && JSON.stringify(scannedLogic) === JSON.stringify(activeLogic)) {
      toast({ description: "This logic is already loaded."});
      return; 
    }
    handleLogicUpdate(scannedLogic);
  };
  
  const handleLoadLogic = (logic: Logic) => {
    handleLogicUpdate(logic);
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
                No logic loaded. Scan a QR code to begin automation.
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
          />
        )}
      </div>
      <div>
        <SavedLogicList savedLogics={savedLogics} onLoad={handleLoadLogic} onDelete={deleteLogic} />
      </div>
    </div>
  );
}
