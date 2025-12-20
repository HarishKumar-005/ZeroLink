"use client";

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export function PWAProvider() {
  const { toast } = useToast();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
          toast({
            title: 'Service Worker Error',
            description: 'Failed to register service worker for offline support.',
            variant: 'destructive',
          });
        });
      });
    }
  }, [toast]);

  return null;
}
