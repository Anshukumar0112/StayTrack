import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "StayTrack | Find. Book. Stay. Direct.",
  description: "Direct accommodation platform. Find rooms, PGs, flats, and hotels across Delhi NCR.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased bg-background`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <div className="mesh-bg" />
        {children}
      </body>
    </html>
  );
}

