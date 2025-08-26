import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SupabaseProvider from "@/components/providers/supabase-provider";
import OneSignalProvider from "@/components/providers/onesignal-provider";
import { initAnalytics } from "@/lib/analytics";

// Import Sentry
import * as Sentry from "@sentry/nextjs";

// Initialize Sentry (only in production)
if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    beforeSend(event, hint) {
      // Don't send certain errors to reduce noise
      const error = hint.originalException;
      if (error && typeof error === 'object' && 'message' in error) {
        const message = error.message as string;
        if (message.includes('ResizeObserver loop limit exceeded') ||
            message.includes('Non-Error promise rejection captured')) {
          return null;
        }
      }
      return event;
    }
  });
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sparq Connection - Daily Rituals for Couples",
  description: "A 5-8 minute daily ritual that helps couples build kinder, stronger relationships through personalized prompts and micro-actions.",
};

// Initialize analytics on client-side
if (typeof window !== 'undefined') {
  initAnalytics();
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SupabaseProvider>
          <OneSignalProvider>
            {children}
          </OneSignalProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
