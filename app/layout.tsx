import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Committed woff2 files → the demo needs no network for fonts.
// Type pairing lifted from polama.xyz: Outfit for headings, DM Sans for
// body/UI. Both are variable-weight latin subsets from Google Fonts (OFL),
// so self-hosting them here is fine.
const dmSans = localFont({
  src: "./fonts/dm-sans-latin.woff2",
  weight: "400 700",
  variable: "--font-dm-sans",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const outfit = localFont({
  src: "./fonts/outfit-latin.woff2",
  weight: "400 800",
  variable: "--font-outfit",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Mandi Mitra · MSP Procurement",
  description: "SIH 2026 PS 26032 — farmer procurement slot booking & queue management",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${outfit.variable}`}>
      <body className="min-h-screen bg-white font-sans text-gray-800 antialiased">{children}</body>
    </html>
  );
}
