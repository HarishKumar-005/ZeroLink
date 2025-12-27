
"use client";

import React, { useMemo, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { type Logic } from '@/lib/schema';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"

interface QrCodeDisplayProps {
  logic: Logic;
}

const CHUNK_SIZE = 250; // A reasonable size for QR codes

type QrChunk = {
  sessionId: string;
  chunkIndex: number;
  totalChunks: number;
  data: string;
  checksum: string; // Add checksum for data integrity
}

// Simple checksum function for data integrity
function calculateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

export function QrCodeDisplay({ logic }: QrCodeDisplayProps) {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [count, setCount] = React.useState(0)

  const sessionId = useMemo(() => crypto.randomUUID(), [logic]);

  const chunks = useMemo(() => {
    const logicString = JSON.stringify(logic);
    
    // Calculate overhead more accurately with checksum included
    const sampleChunk: QrChunk = { 
      sessionId: "a".repeat(36), // UUID length
      chunkIndex: 99, 
      totalChunks: 99, 
      data: "",
      checksum: "xxxxxx" // approximate checksum length
    };
    const overhead = JSON.stringify(sampleChunk).length;
    const effectiveChunkSize = Math.max(50, CHUNK_SIZE - overhead); // Ensure minimum chunk size
    
    const numChunks = Math.ceil(logicString.length / effectiveChunkSize) || 1;
    
    const newChunks = [];
    for (let i = 0; i < numChunks; i++) {
      const content = logicString.substring(i * effectiveChunkSize, (i + 1) * effectiveChunkSize);
      const chunk: QrChunk = {
        sessionId: sessionId,
        chunkIndex: i + 1,
        totalChunks: numChunks,
        data: content,
        checksum: calculateChecksum(content),
      };
      newChunks.push(JSON.stringify(chunk));
    }
    return newChunks;
  }, [logic, sessionId]);

  const plugin = React.useRef(
    Autoplay({ delay: 1500, stopOnInteraction: true })
  )

  useEffect(() => {
    if (!api) {
      return
    }
 
    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap() + 1)
 
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1)
    })
  }, [api])

  return (
    <Card className="bg-accent/20 border-accent">
      <CardContent className="p-6 flex flex-col items-center justify-center">
        <Carousel 
          setApi={setApi} 
          plugins={chunks.length > 1 ? [plugin.current] : []}
          className="w-full max-w-xs"
          onMouseEnter={() => chunks.length > 1 && plugin.current.stop()}
          onMouseLeave={() => chunks.length > 1 && plugin.current.reset()}
        >
          <CarouselContent>
            {chunks.map((chunk, index) => (
              <CarouselItem key={index}>
                <div className="p-4 bg-white rounded-lg shadow-md flex items-center justify-center">
                  <QRCodeSVG
                    value={chunk}
                    size={200}
                    level={"L"} // Level L is more resilient to errors
                    includeMargin={true}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        {chunks.length > 1 && (
          <p className="mt-4 text-sm text-muted-foreground">
            Part {current} of {count}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
