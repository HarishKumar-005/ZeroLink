
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import ErrorBoundary from '@/components/error-boundary';

export const metadata: Metadata = {
  title: 'ZeroLink – Offline Automation Protocol',
  description: 'Build and transmit automation logic using natural language and QR codes. Offline, agentic, and AI-powered.',
  openGraph: {
    title: 'ZeroLink – Offline Automation Protocol',
    description: 'Create shareable, AI-generated automation rules for any device – without code or internet.',
  }
};

export const viewport: Viewport = {
  themeColor: '#673AB7',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <ErrorBoundary>
          <Analytics />
          <SpeedInsights />
          {children}
          <Toaster />
        </ErrorBoundary>
      </body>
    </html>
  );
}
