import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";


const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Svetla Stran - Uredniški Inbox",
  description: "Portal pozitivnih novic iz Slovenije",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sl" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
}
