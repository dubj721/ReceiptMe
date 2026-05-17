import type { Metadata, Viewport } from "next";
import "./globals.css";
import SessionRefresher from "@/components/ui/SessionRefresher";

export const metadata: Metadata = {
  title: "Receipt Manager — Insight Global",
  description: "Capture, organize, and export expense receipts",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#00283C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <SessionRefresher />
        {children}
      </body>
    </html>
  );
}
