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

const CHUNK_SIZE = 250; 

export function QrCodeDisplay({ logic }: QrCodeDisplayProps) {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [count, setCount] = React.useState(0)

  const chunks = useMemo(() => {
    const logicString = JSON.stringify(logic);
    const numChunks = Math.ceil(logicString.length / CHUNK_SIZE);
    if (numChunks <= 1) {
      return [logicString];
    }
    const newChunks = [];
    for (let i = 0; i < numChunks; i++) {
      const prefix = `[${i + 1}/${numChunks}]`;
      const availableSize = CHUNK_SIZE - prefix.length;
      const content = logicString.substring(i * availableSize, (i + 1) * availableSize);
      newChunks.push(prefix + content);
    }
    return newChunks;
  }, [logic]);

  const plugin = React.useRef(
    Autoplay({ delay: 2000, stopOnInteraction: true })
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
                    level={"L"}
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
