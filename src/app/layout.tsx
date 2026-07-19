import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { RegisterSW } from "@/components/register-sw";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "AI Day Planner",
  description: "Dump your thoughts, AI structures your day",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AI Planner",
  },
};

export const viewport: Viewport = {
  themeColor: "#f8f7ff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
