import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Committed woff2 files → the demo needs no network for fonts.
// Same family across EN/HI so text doesn't jump on language switch.
const notoSans = localFont({
  src: "./fonts/noto-sans-latin.woff2",
  weight: "400 900",
  variable: "--font-noto",
  display: "swap",
});
const notoDevanagari = localFont({
  src: "./fonts/noto-sans-devanagari.woff2",
  weight: "400 900",
  variable: "--font-noto-dev",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mandi Mitra · MSP Procurement",
  description: "SIH 2026 PS 26032 — farmer procurement slot booking & queue management",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${notoSans.variable} ${notoDevanagari.variable}`}>
      <body className="min-h-screen bg-page font-sans text-gray-800 antialiased">{children}</body>
    </html>
  );
}
