import type { Metadata } from "next";
import Link from "next/link";
import { HAOTI_LINE_URL, withUtm } from "@/lib/brand";

export const metadata: Metadata = {
  title: "接案報價模板包 | 好算",
  description:
    "給自由工作者與小型服務業的接案報價模板包。整理範圍、付款節點、修改次數、驗收與維護責任，避免靠感覺報價。",
  keywords: ["接案報價", "報價模板", "自由工作者", "接案", "估價單"],
  openGraph: {
    title: "接案報價模板包 | 好算",
    description: "少算一項成本，就是免費加班。用模板把報價範圍、付款節點與風險講清楚。",
    url: "https://haosuan.com/templates/freelance-pricing",
  },
};

const features = [
  "專案範圍與不包含項目檢查表",
  "工時、溝通、修改輪次與風險成本估算",
  "訂金 / 里程碑 / 尾款付款節點設計",
  "驗收、交接與維護責任文字範本",
  "官網、LINE Bot、AI 整合與維護案報價範例",
];

const packageItems = [
  {
    title: "01｜報價前檢查表",
    description: "確認需求來源、交付範圍、素材提供、溝通窗口、時程壓力與付款條件，避免還沒報價就先踩雷。",
  },
  {
    title: "02｜成本拆解表",
    description: "把製作工時、會議溝通、修改輪次、測試驗收、部署與維護拆開，讓價格不是憑感覺喊。",
  },
  {
    title: "03｜風險係數表",
    description: "針對需求模糊、第三方 API、金流、個資、緊急交付、跨部門窗口等情境加上風險倍率。",
  },
  {
    title: "04｜報價單文字範本",
    description: "內含範圍、不包含項目、付款節點、修改次數、驗收標準、保固與維護責任文字。",
  },
];

const scenarios = [
  "工程師：官網、後台、LINE Bot、AI 整合、維護案",
  "設計師：品牌視覺、Landing Page、社群素材、修改輪次",
  "小型工程：油漆、磁磚、冷氣、材料損耗、施工期程",
];

const experiments = [
  "Lite：NT$299，適合剛開始接案，先有一份不漏項的報價骨架。",
  "Pro：NT$499，增加範例報價單、風險條款與維護合約欄位。",
  "客製：NT$2,000 起，整理成你的服務項目與報價邏輯。",
];

export default function FreelancePricingTemplatePage() {
  const lineUrl = withUtm(HAOTI_LINE_URL, "freelance-pricing");

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-semibold text-slate-500">好算模板包</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          接案報價不要再憑感覺
        </h1>
        <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">
          報太高，客戶不回；報太低，後面做到虧。這份模板包先幫你把範圍、付款節點、修改次數、驗收與維護責任列清楚，減少「案子有接到，但你在免費加班」的情況。
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={lineUrl}
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            加入 LINE 詢問 / 領模板
          </a>
          <Link
            href="/finance/overtime"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-500 hover:text-slate-950 dark:border-slate-700 dark:text-slate-200"
          >
            先用免費工具試算
          </Link>
        </div>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
          <h2 className="text-xl font-semibold">模板會包含什麼？</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
            {features.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span aria-hidden="true">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
          <h2 className="text-xl font-semibold">價格實驗</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
            {experiments.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-6 text-slate-500">
            目前為市場需求驗證版本。模板內容僅供估算與溝通輔助，不取代法律、會計或專業報價意見。
          </p>
        </div>
      </section>

      <section className="mt-10 rounded-2xl bg-slate-50 p-6 dark:bg-slate-900/50">
        <h2 className="text-xl font-semibold">v1 會先做成這 4 個模組</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {packageItems.map((item) => (
            <article key={item.title} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
          <h2 className="text-xl font-semibold">適合誰？</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
            適合剛開始接案的工程師、設計師、顧問、小型工作室與需要把服務項目講清楚的人。若你的報價每次都從空白文件開始，或常常漏算修改與維護成本，這份模板會先幫你把底線畫出來。
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
          <h2 className="text-xl font-semibold">首波情境</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
            {scenarios.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
        <h2 className="text-lg font-semibold">預購說明</h2>
        <p className="mt-2">
          目前是市場驗證版，付款與交付流程尚未正式自動化。若你想先拿 v1，請用上方按鈕寄信詢問；正式金流上線前不會收集不必要個資。
        </p>
      </section>
    </main>
  );
}
