
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
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Lightbulb, Info } from 'lucide-react';

export function ReceiverView() {
  const [activeLogic, setActiveLogic] = useState<Logic | null>(null);
  const [sensorData, setSensorData] = useState<SensorData>({
    light: 250,
    temperature: 20,
    motion: false,
  });
  const [isFlashing, setIsFlashing] = useState(false);
  const [manualJson, setManualJson] = useState('');

  const { toast } = useToast();
  const { savedLogics, saveLogic, deleteLogic } = useLogicStorage();
  const { eventLog, clearLog } = useLogicRunner(activeLogic, sensorData);
  
  const handleLogicUpdate = (logicToSet: Logic | null) => {
    setActiveLogic(logicToSet);
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

  const handleManualLoad = () => {
    try {
      const parsedLogic = JSON.parse(manualJson) as Logic;
      // Basic validation
      if (parsedLogic.name && parsedLogic.trigger && parsedLogic.action) {
        handleLogicScanned(parsedLogic);
        setManualJson('');
      } else {
        throw new Error('Invalid logic structure.');
      }
    } catch (e) {
      toast({
        title: "Invalid JSON",
        description: "The provided text is not valid logic JSON. Please check and try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-6">
        {!activeLogic ? (
          <Card>
            <CardHeader>
              <CardTitle>Scan or Load Logic</CardTitle>
              <CardDescription>
                Scan a ZeroLink QR code or paste JSON to load an automation rule.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <QrScanner onScanSuccess={handleLogicScanned} />
              
              <div className="space-y-2">
                  <Label htmlFor="manual-json">Fallback: Paste Logic JSON</Label>
                  <Textarea 
                      id="manual-json"
                      value={manualJson}
                      onChange={e => setManualJson(e.target.value)}
                      placeholder='Paste the logic JSON here if camera is unavailable...'
                      className="font-mono text-xs"
                  />
                  <Button onClick={handleManualLoad} disabled={!manualJson}>Load from Text</Button>
              </div>

               <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>No Logic Loaded</AlertTitle>
                  <AlertDescription>
                    No automation logic is active. Scan a QR code, paste JSON, or select a rule from your saved logics to begin.
                  </AlertDescription>
               </Alert>
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
