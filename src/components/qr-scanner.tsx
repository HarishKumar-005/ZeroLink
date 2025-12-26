
"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, type Html5QrcodeError, type Html5QrcodeResult } from 'html5-qrcode';
import { type Logic } from '@/lib/schema';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Camera, RefreshCw, Loader2, X, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';

interface QrScannerProps {
  onScanSuccess: (logic: Logic) => void;
}

type CameraState = 'idle' | 'loading' | 'streaming' | 'denied' | 'error' | 'unsupported';

type QrChunk = {
  sessionId: string;
  chunkIndex: number;
  totalChunks: number;
  data: string;
}

const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
  const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
  const qrboxSize = Math.floor(minEdge * 0.8);
  return {
    width: qrboxSize,
    height: qrboxSize,
  };
};

export function QrScanner({ onScanSuccess }: QrScannerProps) {
  const { toast } = useToast();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  
  // State for multi-part scan
  const [scanSessionId, setScanSessionId] = useState<string | null>(null);
  const [scannedChunks, setScannedChunks] = useState<Map<number, string>>(new Map());
  const [totalChunks, setTotalChunks] = useState<number | null>(null);
  const lastScannedPart = useRef<number | null>(null);
  const consecutiveScans = useRef<number>(0);
  
  const resetScanState = useCallback(() => {
    setScanSessionId(null);
    setScannedChunks(new Map());
    setTotalChunks(null);
    lastScannedPart.current = null;
    consecutiveScans.current = 0;
  }, []);

  const processAndFinalize = useCallback(() => {
    if (!totalChunks || scannedChunks.size !== totalChunks) {
      toast({ title: 'Incomplete Scan', description: 'Some parts are missing. Please try scanning the remaining QR codes.', variant: 'destructive'});
      return;
    }

    const sortedChunks = Array.from(scannedChunks.entries()).sort((a, b) => a[0] - b[0]);
    const fullString = sortedChunks.map(chunk => chunk[1]).join('');
    
    try {
      const logic = JSON.parse(fullString) as Logic;
      onScanSuccess(logic);
      stopScan(true); // Success
    } catch (e) {
      toast({ title: 'Assembly Error', description: 'Failed to parse combined QR data. The parts may be from different logics.', variant: 'destructive' });
      resetScanState();
    }
  }, [scannedChunks, totalChunks, onScanSuccess, resetScanState, toast]);

  useEffect(() => {
    if (totalChunks && scannedChunks.size === totalChunks) {
        processAndFinalize();
    }
  }, [scannedChunks, totalChunks, processAndFinalize]);

  const stopScan = useCallback(async (isSuccess = false) => {
    const wasScanning = scannerRef.current && scannerRef.current.isScanning;
    if (wasScanning) {
      try {
        await scannerRef.current!.stop();
        console.log('Scanner stopped.');
      } catch (err) {
        // This error is thrown by the library when stop() is called while it's already stopping.
        // It's safe to ignore as it's part of the normal lifecycle.
      }
    }
    setCameraState('idle');
    if (wasScanning && !isSuccess) {
      toast({
        title: "Scan Stopped",
        description: "❌ Scan cancelled. All progress has been reset.",
      });
    }
    resetScanState();
  }, [resetScanState, toast]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        stopScan(true); // Treat unmount as a successful stop to avoid the toast
      }
    };
  }, [stopScan]);

  const handleScanSuccess = (decodedText: string, result: Html5QrcodeResult) => {
    try {
      const parsed = JSON.parse(decodedText) as QrChunk;
      // It's a structured chunk
      if (parsed.sessionId && parsed.chunkIndex !== undefined && parsed.totalChunks && parsed.data) {
          
          if (scanSessionId === null) {
              // First chunk of a new session
              setScanSessionId(parsed.sessionId);
              setTotalChunks(parsed.totalChunks);
              toast({ description: `Multipart logic detected. Total parts: ${parsed.totalChunks}.` });
          } else if (scanSessionId !== parsed.sessionId) {
              toast({ title: 'Scan Mismatch', description: 'This QR code is from a different logic. Please reset and start over.', variant: 'destructive' });
              return;
          }
          
          if (!scannedChunks.has(parsed.chunkIndex)) {
            setScannedChunks(new Map(scannedChunks.set(parsed.chunkIndex, parsed.data)));
          }

          // Soft retry logic
          if (lastScannedPart.current === parsed.chunkIndex) {
            consecutiveScans.current += 1;
            if (consecutiveScans.current >= 3 && scannedChunks.size < totalChunks!) {
              toast({ title: "Still scanning...", description: `Missing ${totalChunks! - scannedChunks.size} parts. Try showing a different QR code.` });
              consecutiveScans.current = 0; // Reset counter after showing toast
            }
          } else {
            lastScannedPart.current = parsed.chunkIndex;
            consecutiveScans.current = 1;
          }

      } else {
          // Fallback for single, unstructured QR codes
          const logic = JSON.parse(decodedText) as Logic;
          onScanSuccess(logic);
          stopScan(true);
      }
    } catch (e) {
      // Potentially a single-part QR code that isn't chunked JSON
      try {
        const logic = JSON.parse(decodedText) as Logic;
        onScanSuccess(logic);
        stopScan(true);
      } catch (e2) {
        // Ignore errors, as the scanner will keep trying
      }
    }
  };

  const startScan = async () => {
    resetScanState();
    setCameraState('loading');
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Camera API not supported.");
        setCameraState('unsupported');
        return;
    }
    console.log('Requesting camera permission...');
    
    try {
        // We only request the stream to check for permission.
        // Html5Qrcode will manage the stream itself.
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        console.log('Camera permission granted.');
        // We must stop the track immediately, otherwise Html5Qrcode cannot use the camera.
        stream.getTracks().forEach(track => track.stop());
    } catch (err) {
        console.error("Camera permission error:", err);
        setCameraState('denied');
        return;
    }

    if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("qr-reader", { verbose: false });
    }

    try {
        await scannerRef.current.start(
            { facingMode: "environment" },
            { fps: 5, qrbox: qrboxFunction, aspectRatio: 1.0 },
            handleScanSuccess,
            (errorMessage: string, error: Html5QrcodeError) => { /* ignore parse errors */ }
        );
        console.log('Scanner started.');
        setCameraState('streaming');
    } catch(err) {
        console.error("Scanner failed to start:", err);
        setCameraState('error');
    }
  };

  const isScanning = cameraState === 'streaming';
  
  if (['denied', 'error', 'unsupported'].includes(cameraState)) {
     return (
        <Card className="border-destructive">
            <CardContent className="p-6">
                <Alert variant="destructive" className="border-none p-0">
                    <ShieldAlert className="h-5 w-5"/>
                    <AlertTitle>Camera Problem Detected</AlertTitle>
                    <AlertDescription>
                    <p className="mb-4">
                        {cameraState === 'denied' && "Camera access was denied. Please check your browser's site settings to grant permission."}
                        {cameraState === 'error' && "The camera failed to start. This can happen if another app is using it or if there was a temporary hardware issue."}
                        {cameraState === 'unsupported' && "We can't access your camera. This feature isn't supported on your device or browser."}
                    </p>
                    <p className="mb-4 text-xs">
                        For the best experience, try a modern browser like Chrome on your device. If issues persist, you can always paste the logic JSON in the text field below.
                    </p>
                    <Button onClick={startScan}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Retry Camera Access
                    </Button>
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
     )
  }

  const scanProgress = totalChunks ? Math.round((scannedChunks.size / totalChunks) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={cn("scanner-box w-full", isScanning && "scanning")} style={{maxWidth: '500px'}}>
        <div id="qr-reader" className={cn(cameraState === 'idle' && 'hidden')} />
        
        {cameraState === 'idle' && (
          <div className="aspect-square w-full bg-muted rounded-lg flex items-center justify-center text-center p-4">
             <p className="text-muted-foreground">Click "Start Scanning" to activate the camera.</p>
          </div>
        )}
        
        {cameraState === 'loading' && (
          <div className="aspect-square w-full bg-muted rounded-lg flex flex-col items-center justify-center text-center p-4">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
             <p className="text-muted-foreground">Initializing camera...</p>
             <p className="text-xs text-muted-foreground mt-1">Please allow camera access when prompted.</p>
          </div>
        )}

        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute bottom-4 bg-black/50 text-white px-4 py-2 rounded-lg text-sm font-semibold">
              📷 Align QR code within the box
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!isScanning ? (
          <Button onClick={startScan} disabled={cameraState === 'loading'}>
            {cameraState === 'loading' ? <Loader2 className="mr-2 animate-spin" /> : <Camera className="mr-2"/>}
            {cameraState === 'loading' ? 'Starting...' : 'Start Scanning'}
          </Button>
        ) : (
          <Button onClick={() => stopScan(false)} variant="destructive">
              <X className="mr-2 h-4 w-4" />
              Stop Scanning
          </Button>
        )}
      </div>

      {totalChunks && isScanning && (
         <div className="text-center w-full max-w-sm space-y-2">
            <p className="font-semibold text-lg">📦 {scannedChunks.size} of {totalChunks} parts received</p>
            <Progress value={scanProgress} className="w-full" />
            <Button onClick={resetScanState} variant="outline" size="sm" className="mt-2">
                <RefreshCw className="mr-2 h-3 w-3" />
                Reset Progress
            </Button>
         </div>
      )}
    </div>
  );
}

    
