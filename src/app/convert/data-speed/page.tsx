import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import NetworkSpeedCalculator from "./NetworkSpeedCalculator";

export const metadata: Metadata = {
  title: "網速換算 — Mbps、Gbps、MB/s、KB/s 互換",
  description:
    "免費線上網速換算工具，支援 Mbps、Kbps、Gbps、MB/s、KB/s 互相換算，並顯示各種使用情境是否足夠。",
  keywords: ["網速換算", "Mbps", "Gbps", "MB/s", "頻寬", "下載速度"],
  openGraph: {
    title: "網速換算 | 好算",
    description: "Mbps、Gbps、MB/s、KB/s 即時互換，附使用情境參考",
    url: "https://haosuan.com/convert/data-speed",
  },
};

const faqs = [
  {
    question: "Mbps 和 MB/s 差在哪？",
    answer:
      "Mbps 是「百萬位元每秒」（Megabits per second），MB/s 是「百萬位元組每秒」（Megabytes per second）。1 Byte = 8 bits，所以 1 MB/s = 8 Mbps。電信業者標示的速度通常是 Mbps，而實際下載速度顯示的是 MB/s。",
  },
  {
    question: "100Mbps 的網路下載速度是多少？",
    answer:
      "100 Mbps 的理論最大下載速度為 12.5 MB/s，也就是每秒可下載約 12.5 MB 的檔案。實際速度會因網路環境、伺服器限速等因素略低。下載 1GB 檔案理論約需 80 秒。",
  },
  {
    question: "看 4K Netflix 需要多少網速？",
    answer:
      "Netflix 官方建議 4K 串流需要至少 25 Mbps 的穩定連線。若家中多人同時使用，建議至少 50-100 Mbps 以上。一般 HD（720p）串流只需 5 Mbps 即可。",
  },
];

const relatedTools = [
  { label: "容量換算", href: "/convert/volume" },
  { label: "長度換算", href: "/convert/length" },
  { label: "溫度換算", href: "/convert/temperature" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "網速換算",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "Mbps、Kbps、Gbps、MB/s、KB/s 網路速度單位互換",
};

export default function DataSpeedPage() {
  return (
    <CalculatorLayout
      title="網速換算"
      description="輸入數值與來源單位，即時換算 Mbps、Kbps、Gbps、MB/s、KB/s，並查看使用情境是否足夠"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <NetworkSpeedCalculator />
    </CalculatorLayout>
  );
}
