
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
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Info, Terminal } from 'lucide-react';
import { Label } from './ui/label';

const LOCAL_STORAGE_KEY = 'zero-link-sim-state';

export function ReceiverView() {
  const [activeLogic, setActiveLogic] = useState<Logic | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  
  const [sensorData, setSensorData] = useState<SensorData>({
    light: 50,
    temperature: 20,
    motion: false,
  });

  const { toast } = useToast();
  const { savedLogics, saveLogic, deleteLogic } = useLogicStorage();
  
  // Load initial sensor state from localStorage
  useEffect(() => {
    try {
      const savedState = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedState) {
        setSensorData(JSON.parse(savedState));
      }
    } catch (error) {
      console.error("Could not load simulator state from localStorage", error);
    }
  }, []);

  // Persist sensor state to localStorage on change
  const handleSensorChange = (newSensorData: SensorData) => {
    setSensorData(newSensorData);
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSensorData));
    } catch (error) {
      console.error("Could not save simulator state to localStorage", error);
    }
  };

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

    toast({
      title: "✅ Logic Loaded: " + scannedLogic.name,
      description: `Device is now simulating the loaded logic.`,
    });

    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
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

  const [manualJson, setManualJson] = useState('');
  const handleManualLoad = () => {
    try {
      const parsedLogic = JSON.parse(manualJson) as Logic;
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

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-6">
        {!activeLogic ? (
          <Card>
            <CardHeader>
              <CardTitle>Scan or Load Logic</CardTitle>
              <CardDescription>
                Scan a ZeroLink QR code, paste JSON, or load a saved rule to start the simulation.
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
                      className="font-mono text-xs h-24"
                  />
                  <Button onClick={handleManualLoad} disabled={!manualJson}>Load from Text</Button>
              </div>

               <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>No Logic Loaded</AlertTitle>
                  <AlertDescription>
                    The simulator is idle. Scan a QR code, paste JSON, or select a rule from your saved logics to begin.
                  </AlertDescription>
               </Alert>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <LogicSimulator
                logic={activeLogic}
                sensorData={sensorData}
                onSensorChange={handleSensorChange}
                onSave={handleSaveCurrentLogic}
                onClear={handleUnload}
                eventLog={eventLog}
                onClearLog={clearLog}
            />
             {isDevelopment && (
                <div className="p-4 border rounded-lg bg-background">
                    <Button variant="ghost" size="sm" onClick={() => setShowDebug(!showDebug)}>
                        <Terminal className="mr-2 h-4 w-4" />
                        {showDebug ? 'Hide' : 'Show'} Raw Logic
                    </Button>
                    {showDebug && (
                        <pre className="mt-2 p-2 bg-muted rounded-md text-xs overflow-auto">
                            <code>{JSON.stringify(activeLogic, null, 2)}</code>
                        </pre>
                    )}
                </div>
            )}
          </div>
        )}
      </div>
      <div>
        <SavedLogicList savedLogics={savedLogics} onLoad={handleLoadLogic} onDelete={deleteLogic} />
      </div>
    </div>
  );
}
