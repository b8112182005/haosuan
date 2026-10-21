import type { Metadata, Viewport } from "next";
import { Noto_Sans_TC, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import InstallPWA from "@/components/common/InstallPWA";
import ServiceWorkerRegister from "@/components/common/ServiceWorkerRegister";
import Script from "next/script";
import { SITE_URL } from "@/lib/site";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const GSC_VERIFICATION = process.env.NEXT_PUBLIC_GSC_VERIFICATION;

const notoSansTC = Noto_Sans_TC({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "好算 HaoSuan — 台灣生活計算工具",
    template: "%s | 好算",
  },
  description:
    "免費線上計算工具，涵蓋生活、財務、裝潢、單位換算等實用計算機，專為台灣用戶設計。",
  metadataBase: new URL(SITE_URL),
  verification: GSC_VERIFICATION ? { google: GSC_VERIFICATION } : undefined,
  openGraph: {
    siteName: "好算 HaoSuan",
    locale: "zh_TW",
    type: "website",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "好算",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body
        className={`${notoSansTC.variable} ${jetBrainsMono.variable} font-sans antialiased`}
      >
        <Header />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
        <InstallPWA />
        <ServiceWorkerRegister />
        {GA_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
