"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QrScanner } from '@/components/qr-scanner';
import { LogicSimulator } from '@/components/logic-simulator';
import { type Logic, type SensorData } from '@/types';
import { useLogicRunner } from '@/hooks/use-logic-runner';
import { useLogicStorage } from '@/hooks/use-logic-storage';
import { SavedLogicList } from './saved-logic-list';

interface ReceiverViewProps {
  initialLogic: Logic | null;
  onLogicLoad: (logic: Logic) => void;
}

export function ReceiverView({ initialLogic, onLogicLoad }: ReceiverViewProps) {
  const [activeLogic, setActiveLogic] = useState<Logic | null>(initialLogic);
  const [sensorData, setSensorData] = useState<SensorData>({
    light: 250,
    temperature: 20,
    motion: false,
  });

  const { savedLogics, saveLogic, deleteLogic } = useLogicStorage();
  const { eventLog, clearLog } = useLogicRunner(activeLogic, sensorData);
  
  useEffect(() => {
    if(initialLogic) setActiveLogic(initialLogic);
  }, [initialLogic]);

  const handleLogicScanned = (scannedLogic: Logic) => {
    setActiveLogic(scannedLogic);
    onLogicLoad(scannedLogic);
  };
  
  const handleLoadLogic = (logic: Logic) => {
    setActiveLogic(logic);
    onLogicLoad(logic);
  }

  const handleSaveCurrentLogic = async () => {
    if (activeLogic) {
      await saveLogic(activeLogic);
    }
  }

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
            </CardContent>
          </Card>
        ) : (
          <LogicSimulator
            logic={activeLogic}
            sensorData={sensorData}
            onSensorChange={setSensorData}
            onSave={handleSaveCurrentLogic}
            onClear={() => setActiveLogic(null)}
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
