
"use client";

import React, { useMemo, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { type Logic } from '@/types';
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
  sessionId: string; // s
  chunkIndex: number; // p
  totalChunks: number; // t
  data: string; // d
}

export function QrCodeDisplay({ logic }: QrCodeDisplayProps) {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [count, setCount] = React.useState(0)

  const sessionId = useMemo(() => crypto.randomUUID(), [logic]);

  const chunks = useMemo(() => {
    const logicString = JSON.stringify(logic);
    
    // Estimate payload overhead: {"sessionId":"...","chunkIndex":99,"totalChunks":99,"data":""}
    const overhead = JSON.stringify({sessionId: sessionId, chunkIndex: 99, totalChunks: 99, data:''}).length;
    const effectiveChunkSize = CHUNK_SIZE - overhead;
    
    const numChunks = Math.ceil(logicString.length / effectiveChunkSize);
    
    const newChunks = [];
    for (let i = 0; i < numChunks; i++) {
      const content = logicString.substring(i * effectiveChunkSize, (i + 1) * effectiveChunkSize);
      const chunk: QrChunk = {
        sessionId: sessionId,
        chunkIndex: i + 1,
        totalChunks: numChunks,
        data: content,
      };
      newChunks.push(JSON.stringify(chunk));
    }
    // If there are no chunks (empty logic?), create one to avoid errors.
    if (newChunks.length === 0) {
        newChunks.push(JSON.stringify({ sessionId, chunkIndex: 1, totalChunks: 1, data: '{}' } as QrChunk));
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
