import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StarEleven AI SaaS | Multi-Agent Automation Platform",
  description:
    "Enterprise Multi-Tenant AI Agentic SaaS Platform powered by LangGraph, FastAPI, and Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        suppressHydrationWarning
        className={`${jakarta.variable} ${jetbrains.variable} bg-surface-bg text-zinc-100 font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}