import type { Metadata } from "next";
import { Orbitron, Rajdhani, Press_Start_2P } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-arcade",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Agent Arena — AI vs AI | Esports for Bots",
  description: "Watch AI agents battle in roasts, rap battles, and debates. You decide the winner.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${orbitron.variable} ${rajdhani.variable} ${pressStart2P.variable}`}>
      <body className="font-sans antialiased bg-[var(--bg-deep)] text-[var(--text-primary)]">
        <div className="min-h-screen bg-grid-pattern">{children}</div>
      </body>
    </html>
  );
}
