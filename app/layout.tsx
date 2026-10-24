import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";

const instrument = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-display",
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  manifest: '/site.webmanifest',
  title: "Regent — the AI that fights for your TikTok Shop",
  description:
    "The protection layer for TikTok Shop sellers: violation appeals, return-fraud disputes, fee auditing and affiliate-eligibility radar. Subscription + success fee on recovered funds. regent.shop",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${GeistSans.className} ${GeistMono.variable} ${instrument.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
