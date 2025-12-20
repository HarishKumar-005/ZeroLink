"use client";

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { type Logic } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Camera, RefreshCw } from 'lucide-react';

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
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
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
        toast({
          title: 'Logic Loaded!',
          description: `Successfully loaded logic: ${logic.name}`,
        });
        stopScan();
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
        toast({
          title: 'Logic Loaded!',
          description: `Successfully loaded logic: ${logic.name}`,
        });
        stopScan();
      } catch (e) {
        toast({ title: 'Scan Error', description: 'Invalid QR code data.', variant: 'destructive' });
        resetScan();
      }
    }
  };

  const startScan = async () => {
    setError(null);
    setIsScanning(true);
    resetScan();

    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length) {
        scannerRef.current = new Html5Qrcode("qr-reader");
        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: qrboxFunction, aspectRatio: 1.0 },
          handleScanSuccess,
          (errorMessage) => { /* ignore parse errors */ }
        );
      } else {
        setError("No camera found.");
        setIsScanning(false);
      }
    } catch (err) {
      setError("Failed to start scanner. Please grant camera permissions.");
      setIsScanning(false);
    }
  };

  const stopScan = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
    }
    setIsScanning(false);
  };

  const resetScan = () => {
    setScannedChunks(new Map());
    setTotalChunks(null);
  };
  
  if(error) {
    return <p className="text-destructive text-center">{error}</p>
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div id="qr-reader" className={`w-full ${!isScanning && 'hidden'}`} style={{maxWidth: '500px'}} />
      
      {!isScanning ? (
        <Button onClick={startScan}>
          <Camera className="mr-2 h-4 w-4"/>
          Start Scanning
        </Button>
      ) : (
        <Button onClick={stopScan} variant="destructive">Stop Scanning</Button>
      )}

      {totalChunks && (
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
