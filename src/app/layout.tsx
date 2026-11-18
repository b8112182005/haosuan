import type { Metadata, Viewport } from "next";
import { Noto_Sans_TC, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BottomTabs from "@/components/layout/BottomTabs";
import InstallPWA from "@/components/common/InstallPWA";
import Toaster from "@/components/common/Toaster";
import ServiceWorkerRegister from "@/components/common/ServiceWorkerRegister";
import PlatformScript from "@/components/app/PlatformScript";
import NativeBridge from "@/components/app/NativeBridge";
import Script from "next/script";
import { SITE_URL, APP_NAME } from "@/lib/site";
import { isAppBuild, searchConsoleVerification } from "@/lib/platform";

const GA_ID = isAppBuild ? undefined : process.env.NEXT_PUBLIC_GA_ID;
// Search Console 驗證碼只放網頁版（判斷在 searchConsoleVerification，兩個環境變數都會擋）
const GSC_VERIFICATION = searchConsoleVerification(
  isAppBuild,
  process.env.GOOGLE_SITE_VERIFICATION,
  process.env.NEXT_PUBLIC_GSC_VERIFICATION,
);

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
    default: `${APP_NAME} — 補助查詢、期限提醒、生活計算工具`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "回答幾個問題，列出你可能符合的政府補助與申請截止日；加入提醒在截止前 30、14、3 天通知你；內建 30 種台灣常用計算機。免費，不接廣告。",
  metadataBase: new URL(SITE_URL),
  verification: GSC_VERIFICATION ? { google: GSC_VERIFICATION } : undefined,
  openGraph: {
    siteName: APP_NAME,
    locale: "zh_TW",
    type: "website",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  // viewport-fit=cover 讓 Capacitor 8 的 SystemBars 注入 --safe-area-inset-*（Android 15 edge-to-edge）
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body
        className={`${notoSansTC.variable} ${jetBrainsMono.variable} font-sans antialiased`}
      >
        <PlatformScript />
        <Header />
        {/* 底部留給分頁列（--tabs-h 在沒有分頁列的桌面網頁版是 0）＋安全區 */}
        <main className="min-h-screen pb-[calc(var(--tabs-h)+var(--safe-bottom))]">
          {children}
        </main>
        <Footer />
        <BottomTabs />
        <Toaster />
        <NativeBridge />
        {!isAppBuild && <InstallPWA />}
        {!isAppBuild && <ServiceWorkerRegister />}
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
