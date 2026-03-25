import type { Metadata } from "next";
import "./globals.css";
import { Geist, Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});
const playfair = Playfair_Display({subsets:['latin'],weight:['400','600'],variable:'--font-brand'});

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sl" className={cn("font-sans", geist.variable, playfair.variable)}>
      <head>
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
          />
        )}
      </head>
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
}
