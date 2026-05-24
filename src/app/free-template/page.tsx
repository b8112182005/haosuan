import type { Metadata } from "next";
import Link from "next/link";
import { CTA_URLS } from "@/lib/brand";
import { serializeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "免費報價與工程管理模板包｜好系列",
  description:
    "領取報價單、成本估算、案場紀錄與請款單模板，協助接案者與小型團隊把報價、紀錄、請款流程整理清楚。",
  keywords: ["免費模板包", "接案報價模板", "工程報價單", "成本估算表", "請款單範本", "好系列"],
  alternates: {
    canonical: "https://haosuan.com/free-template",
  },
  openGraph: {
    type: "website",
    title: "免費報價與工程管理模板包｜好系列",
    description:
      "領取報價單、成本估算、案場紀錄與請款單模板，協助接案者與小型團隊把報價、紀錄、請款流程整理清楚。",
    url: "https://haosuan.com/free-template",
    siteName: "好算 HaoSuan",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "免費報價與工程管理模板包｜好系列",
  description:
    "領取報價單、成本估算、案場紀錄與請款單模板，協助接案者與小型團隊把報價、紀錄、請款流程整理清楚。",
  url: "https://haosuan.com/free-template",
  author: {
    "@type": "Organization",
    name: "好系列編輯部",
  },
};

const templates = [
  {
    title: "工程報價單範本",
    description:
      "協助拆出材料、工資、外包、耗損、交通與風險預備金，避免只用直覺報價。",
  },
  {
    title: "成本估算表",
    description:
      "把固定成本、變動成本與最低利潤先算清楚，降低「案子有接但其實沒賺」的機率。",
  },
  {
    title: "案場紀錄表",
    description:
      "記錄日期、進度、照片、追加事項與客戶確認狀態，減少後續爭議。",
  },
  {
    title: "請款單範本",
    description:
      "整理請款節點、已收款、未收款與備註，讓現金流不要靠記憶維持。記憶不是資料庫，尤其月底。",
  },
];

const audiences = [
  "工程 / 水電 / 裝修接案者",
  "統包與小型工程團隊",
  "設計、監工、顧問服務",
  "一人接案者與自由工作者",
];

const steps = [
  "加入好提官方 LINE。",
  "回覆「模板」。",
  "取得模板包連結。",
  "依自己的案型複製一份後修改。",
];

const audienceTypes = [
  { code: "A", label: "工程 / 水電 / 裝修接案" },
  { code: "B", label: "統包 / 小型工程公司" },
  { code: "C", label: "設計 / 監工 / 顧問" },
  { code: "D", label: "其他" },
];

export default function FreeTemplatePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        {/* Hero */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-500">免費模板包</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
            不要每次報價都從空白文件開始
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-300">
            把報價、成本、案場紀錄、請款節點先整理好，接案才不會做到一半才發現少算、漏記、請不到款。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {audiences.map((a) => (
              <span
                key={a}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                {a}
              </span>
            ))}
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href={CTA_URLS.lineFreeTemplate}
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-200"
            >
              加入官方 LINE，領免費模板包
            </a>
            <Link
              href="/templates/freelance-pricing"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-500 hover:text-slate-950 dark:border-slate-700 dark:text-slate-200"
            >
              看完整報價模板包
            </Link>
          </div>
        </section>

        {/* 模板包內容 */}
        <section className="mt-10 grid gap-5 sm:grid-cols-2">
          {templates.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800"
            >
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {item.description}
              </p>
            </article>
          ))}
        </section>

        {/* 使用方式 */}
        <section className="mt-10 rounded-2xl bg-slate-50 p-6 dark:bg-slate-900/50">
          <h2 className="text-xl font-semibold">使用方式</h2>
          <ol className="mt-4 space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        {/* 分眾提示 */}
        <section className="mt-6 rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
          <h2 className="text-xl font-semibold">加入後回覆你的案型</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            之後會優先整理對應版本的模板與提醒。
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {audienceTypes.map(({ code, label }) => (
              <div
                key={code}
                className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"
              >
                <span className="text-xs font-bold text-slate-400">{code}</span>
                <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 信任與資料使用 */}
        <section className="mt-6 rounded-2xl bg-slate-50 p-6 text-sm leading-7 text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
          <p>
            好系列只整理實用模板、公開資訊與流程提醒，不宣稱官方、不保證任何審核或申請結果。
          </p>
          <p className="mt-2">
            資料只會用於完成模板提供、分眾提醒與服務通知，不出售個人資料。
          </p>
        </section>

        {/* Footer CTA */}
        <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-base font-medium text-slate-700 dark:text-slate-200">
            先領模板包，把下一個案子的報價整理乾淨。
          </p>
          <a
            href={CTA_URLS.lineFreeTemplate}
            className="mt-5 inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            加入官方 LINE，領免費模板包
          </a>
        </section>
      </main>
    </>
  );
}
