import type { Metadata } from "next";
import Link from "next/link";
import { HAOTI_LINE_URL, withUtm } from "@/lib/brand";

export const metadata: Metadata = {
  title: "免費接案與工程模板包 | 好算",
  description:
    "免費領取接案報價、成本估算、案場紀錄與請款單模板，適合自由工作者、小型工程與一人工作室。",
  keywords: ["免費模板包", "接案報價模板", "工程報價單", "成本估算表", "請款單範本"],
  openGraph: {
    title: "免費接案與工程模板包 | 好算",
    description: "把報價、成本、案場紀錄與請款先整理好，避免每案都從空白文件開始。",
    url: "https://haosuan.com/free-template",
  },
};

const templates = [
  {
    title: "工程 / 接案報價單範本",
    description: "列清楚服務範圍、不包含項目、付款節點、修改次數與驗收條件。",
  },
  {
    title: "成本估算表",
    description: "拆出工時、材料、溝通、測試、風險預備金與利潤，避免只用感覺報價。",
  },
  {
    title: "案場 / 專案紀錄表",
    description: "整理日期、進度、照片、問題、追加減與待確認事項，降低後續爭議。",
  },
  {
    title: "請款單範本",
    description: "把里程碑、已完成項目、未稅 / 含稅金額與付款資訊整理成可送出的格式。",
  },
];

const audiences = ["自由接案工程師", "設計 / 顧問工作者", "水電 / 裝修 / 小型工程", "一人工作室與小團隊"];

export default function FreeTemplatePage() {
  const lineUrl = withUtm(HAOTI_LINE_URL, "free-template");

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-semibold text-slate-500">免費模板包</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
          不要每次報價都從空白文件開始
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-300">
          先把報價、成本、案場紀錄與請款格式整理好。加入好提官方 LINE，回覆「模板」，就能領取免費模板包與後續更新通知。
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <a
            href={lineUrl}
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            加入 LINE 領免費模板
          </a>
          <Link
            href="/templates/freelance-pricing"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-500 hover:text-slate-950 dark:border-slate-700 dark:text-slate-200"
          >
            看完整報價模板包
          </Link>
        </div>
      </section>

      <section className="mt-10 grid gap-5 sm:grid-cols-2">
        {templates.map((item) => (
          <article key={item.title} className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
            <h2 className="text-lg font-semibold">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.description}</p>
          </article>
        ))}
      </section>

      <section className="mt-10 rounded-2xl bg-slate-50 p-6 dark:bg-slate-900/50">
        <h2 className="text-xl font-semibold">適合誰？</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {audiences.map((audience) => (
            <span key={audience} className="rounded-full bg-white px-3 py-1 text-sm text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800">
              {audience}
            </span>
          ))}
        </div>
        <p className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-300">
          模板僅供估算、溝通與內部管理參考，不取代法律、會計、稅務或專業契約意見。正式簽約前，仍應依案件風險自行確認條款。
        </p>
      </section>
    </main>
  );
}
