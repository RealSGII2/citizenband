import type { Metadata, Viewport } from "next";
import { Public_Sans } from 'next/font/google';
import "./global.scss";
import React from 'react';
import { GlobalKeybindListener } from "@/app/layoutClient";

const fontSans = Public_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Citizen Band",
  description: "A group voice chat built to simulate the effects of a CB Radio.",
  openGraph: {
    siteName: "Citizen Band",
  }
};

export const viewport: Viewport = {
  themeColor: '#4d94ff'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fontSans.variable}`}>
        <GlobalKeybindListener />

        {children}
      </body>
    </html>
  );
}
