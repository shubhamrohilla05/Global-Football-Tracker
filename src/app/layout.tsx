import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { ScoreTicker } from "@/components/layout/score-ticker";
import { Footer } from "@/components/layout/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display typeface for headlines — geometric, sporty, premium.
const sora = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "PitchPulse — Global Football Activity Tracker",
    template: "%s · PitchPulse",
  },
  description:
    "Every football match worldwide, organized by country and region. Domestic leagues, international fixtures, squads, players to watch, and where to watch — all in one place.",
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    title: "PitchPulse — Global Football Activity Tracker",
    description:
      "Every football match worldwide, organized by country and region.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Navbar />
        <ScoreTicker />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
