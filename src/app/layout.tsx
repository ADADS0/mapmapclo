import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientBody from "./ClientBody";
import Script from "next/script";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CryptoViz Pro | Blockchain Network Explorer",
  description: "Explore and visualize blockchain transactions with stunning real-time network graphs. Track wallets, analyze flows, and discover patterns.",
  keywords: ["blockchain", "crypto", "visualization", "network", "ethereum", "transactions"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <head>
        <Script
          crossOrigin="anonymous"
          src="//unpkg.com/same-runtime/dist/index.global.js"
        />
      </head>
      <body suppressHydrationWarning className="antialiased bg-[#0a0a0f] text-white overflow-x-hidden">
        <ClientBody>{children}</ClientBody>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(10, 10, 15, 0.9)',
              border: '1px solid rgba(0, 255, 136, 0.2)',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  );
}
