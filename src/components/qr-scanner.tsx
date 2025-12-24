
"use client";

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { type Logic } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Camera, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { cn } from '@/lib/utils';

interface QrScannerProps {
  onScanSuccess: (logic: Logic) => void;
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
  const [isScanning, setIsScanning] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scannedChunks, setScannedChunks] = useState<Map<number, string>>(new Map());
  const [totalChunks, setTotalChunks] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Failed to stop scanner", err));
      }
    };
  }, []);

  useEffect(() => {
    if (totalChunks !== null && scannedChunks.size === totalChunks) {
      const sortedChunks = Array.from(scannedChunks.entries()).sort((a, b) => a[0] - b[0]);
      const fullString = sortedChunks.map(chunk => chunk[1]).join('');
      try {
        const logic = JSON.parse(fullString) as Logic;
        onScanSuccess(logic);
        stopScan(true);
      } catch (e) {
        toast({ title: 'Scan Error', description: 'Failed to parse combined QR data.', variant: 'destructive' });
        resetScan();
      }
    }
  }, [scannedChunks, totalChunks, onScanSuccess, toast]);

  const handleScanSuccess = (decodedText: string) => {
    const chunkMatch = decodedText.match(/^\[(\d+)\/(\d+)\]/);
    if (chunkMatch) {
      const part = parseInt(chunkMatch[1], 10);
      const total = parseInt(chunkMatch[2], 10);
      const content = decodedText.substring(chunkMatch[0].length);

      if (totalChunks === null) setTotalChunks(total);
      
      if (!scannedChunks.has(part)) {
        setScannedChunks(new Map(scannedChunks.set(part, content)));
        toast({ description: `Scanned part ${part} of ${total}.` });
      }
    } else {
      // Single QR code
      try {
        const logic = JSON.parse(decodedText) as Logic;
        onScanSuccess(logic);
        stopScan(true);
      } catch (e) {
        toast({ title: 'Scan Error', description: 'Invalid QR code data.', variant: 'destructive' });
        resetScan();
      }
    }
  };
  
  const startScan = async () => {
    setIsScanning(true);
    resetScan();

    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setHasCameraPermission(true);

      scannerRef.current = new Html5Qrcode("qr-reader");
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: qrboxFunction, aspectRatio: 1.0 },
        handleScanSuccess,
        (errorMessage) => { /* ignore parse errors */ }
      );
    } catch (err) {
      console.error("Scanner Error:", err);
      toast({
        title: "Camera Permission Denied",
        description: "Please enable camera permissions to scan QR codes.",
        variant: "destructive",
      });
      setHasCameraPermission(false);
      setIsScanning(false);
    }
  };

  const stopScan = async (isSuccess = false) => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
    }
    if (!isSuccess) {
      toast({
        title: "Scan Stopped",
        description: scannedChunks.size > 0 ? "❌ QR not detected. Try again." : "Scanning was cancelled.",
        variant: scannedChunks.size > 0 ? "destructive" : "default"
      });
    }
    setIsScanning(false);
  };

  const resetScan = () => {
    setScannedChunks(new Map());
    setTotalChunks(null);
  };
  
  if(hasCameraPermission === false) {
     return (
       <Alert variant="destructive">
         <AlertTitle>Camera Access Denied</AlertTitle>
         <AlertDescription>
           Please enable camera permissions in your browser settings to scan QR codes.
         </AlertDescription>
       </Alert>
     )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={cn("scanner-box w-full", isScanning && "scanning")} style={{maxWidth: '500px'}}>
        <div id="qr-reader" className={cn(!isScanning && 'hidden')} />
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute bottom-4 bg-black/50 text-white px-4 py-2 rounded-lg text-sm font-semibold">
              📷 Align QR code within the box
            </div>
          </div>
        )}
      </div>

      {!isScanning ? (
        <Button onClick={startScan}>
          <Camera className="mr-2 h-4 w-4"/>
          Start Scanning
        </Button>
      ) : (
        <Button onClick={() => stopScan(false)} variant="destructive">Stop Scanning</Button>
      )}

      {totalChunks && isScanning && (
         <div className="text-center">
            <p>Scanning multipart logic...</p>
            <p className="font-bold">{scannedChunks.size} / {totalChunks} parts found</p>
            <Button onClick={resetScan} variant="outline" size="sm" className="mt-2">
                <RefreshCw className="mr-2 h-3 w-3" />
                Reset
            </Button>
         </div>
      )}
    </div>
  );
}
