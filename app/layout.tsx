import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PWAInstall } from "@/components/pwa-install";

export const metadata: Metadata = {
  title: "FCT Giris/Cikis Takip",
  description: "FCT Personel Giris/Cikis Takip Sistemi",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FCT Takip",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/icon.svg",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1E3A5F",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FCT Takip" />
      </head>
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        {children}
        <PWAInstall />
      </body>
    </html>
  );
}
