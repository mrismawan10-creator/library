import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Prompt Library Dashboard",
  description:
    "A personal, visual catalog for storing, finding, copying, and editing AI prompts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${fraunces.variable} antialiased`}>
        <a
          href="#main"
          className="bg-primary text-primary-foreground sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
