import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { PlatformTool } from "@/components/PlatformTool";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fairground-umber.vercel.app"),
  title: "Fairground — settle disputes with your agent at your side",
  description:
    "A neutral ground where two people — and their AI agents — resolve real disputes in minutes. Sealed offers, a neutral mediator, and agreements only humans can sign.",
  openGraph: {
    title: "Fairground",
    description:
      "Justice, for disputes too small for lawyers. Two people, two AI advocates, one neutral table — sealed offers, neutral mediation, human-only signatures. Built on WebMCP.",
    url: "https://fairground-umber.vercel.app",
    siteName: "Fairground",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fairground — settle disputes with your agent at your side",
    description:
      "Justice, for disputes too small for lawyers. Two people, two AI advocates, one neutral table. Built on WebMCP.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink font-body">
        <PlatformTool />
        {children}
      </body>
    </html>
  );
}
