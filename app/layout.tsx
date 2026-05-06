import type { Metadata, Viewport } from "next";
import ReactDOM from "react-dom";
import "./globals.css";
import { Geist, Playfair_Display, Newsreader, Fraunces } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { cn } from "@/lib/utils";

const R2_ORIGIN = process.env.R2_PUBLIC_URL ?? "https://pub-e799b0ecc3b54685a8c2d29386529664.r2.dev";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});
const playfair = Playfair_Display({subsets:['latin'],weight:['400','600'],variable:'--font-brand'});
const newsreader = Newsreader({subsets:['latin','latin-ext'],weight:['400','500'],style:['normal','italic'],variable:'--font-longform-body'});
const fraunces = Fraunces({subsets:['latin','latin-ext'],weight:['400','500','600','700'],style:['normal','italic'],variable:'--font-longform-display'});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://svetlastran.si'),
  title: {
    default: 'Svetla Stran — dobre zgodbe iz Slovenije',
    template: '%s | Svetla Stran',
  },
  description: 'Portal pozitivnih novic iz Slovenije. Preverjene zgodbe o ljudeh, dosežkih in napredku.',
  openGraph: {
    type: 'website',
    locale: 'sl_SI',
    siteName: 'Svetla Stran',
    title: 'Svetla Stran — dobre zgodbe iz Slovenije',
    description: 'Za vsak strup, ki ga mediji dajejo, imamo zdravilo. Preverjene zgodbe o ljudeh, dosežkih in napredku.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Svetla Stran — dobre zgodbe iz Slovenije',
    description: 'Portal pozitivnih novic iz Slovenije.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7faff' },
    { media: '(prefers-color-scheme: dark)', color: '#0c1119' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Hand the browser an early hint to set up the R2 connection before the
  // first <Image> needs it — saves ~50–150 ms on the first image fetch.
  ReactDOM.preconnect(R2_ORIGIN);
  ReactDOM.prefetchDNS(R2_ORIGIN);

  return (
    <html lang="sl" className={cn("font-sans", geist.variable, playfair.variable, newsreader.variable, fraunces.variable)}>
      <body className="min-h-screen bg-background antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
