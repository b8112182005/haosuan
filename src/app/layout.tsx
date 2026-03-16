import type { Metadata } from "next";
import { Noto_Sans_TC, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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
  metadataBase: new URL("https://haosuan.com"),
  openGraph: {
    siteName: "好算 HaoSuan",
    locale: "zh_TW",
    type: "website",
  },
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
        {children}
      </body>
    </html>
  );
}
