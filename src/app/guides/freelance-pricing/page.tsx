import type { Metadata } from "next";
import Link from "next/link";
import { HAOTI_LINE_URL, withUtm } from "@/lib/brand";

export const metadata: Metadata = {
  title: "接案報價怎麼算？自由工作者避免低估的 5 個步驟 | 好算",
  description:
    "接案報價不能只看工時。用 5 個步驟拆出底價、溝通成本、修改輪次、風險預備金與利潤，避免接到案卻變成免費加班。",
  keywords: ["接案報價怎麼算", "自由工作者報價", "接案成本", "接案時薪", "報價模板"],
  openGraph: {
    title: "接案報價怎麼算？自由工作者避免低估的 5 個步驟",
    description: "把工時、成本、風險與利潤拆開，避免用感覺報價。",
    url: "/guides/freelance-pricing",
  },
};

const steps = [
  {
    title: "1. 先算你的最低時薪，不要用月薪直除",
    body: "自由工作者的時薪要包含空窗期、業務開發、行政、稅務、設備與學習成本。若你只把月薪除以工作時數，通常會低估 30% 以上。",
  },
  {
    title: "2. 把交付拆成可估算的工作包",
    body: "不要只寫『做一個網站』。請拆成需求確認、設計、前端、後端、測試、部署、文件、教學與驗收。拆得越清楚，越不容易被追加需求吃掉。",
  },
  {
    title: "3. 溝通與修改要明確列入成本",
    body: "會議、訊息回覆、改稿、等待素材、協調窗口都是真成本。建議每個專案至少預留 15%～30% 作為溝通與修改緩衝。",
  },
  {
    title: "4. 根據風險加成，不要所有案子同價",
    body: "需求模糊、時程緊、第三方 API、金流、個資、舊系統串接、窗口太多，都應該加風險係數。風險不是你免費吸收的東西。",
  },
  {
    title: "5. 報價單要寫清楚不包含項目",
    body: "很多爭議不是價格，而是邊界。請明確寫出不含文案、不含素材製作、不含額外頁面、不含第三方費用、不含長期維護等條件。",
  },
];

const checklist = [
  "是否列出交付範圍與不包含項目？",
  "是否限制修改輪次？",
  "是否拆出訂金、里程碑與尾款？",
  "是否列入維護、保固與交接責任？",
  "是否把第三方費用與稅費分開寫？",
];

export default function FreelancePricingGuidePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <article>
        <p className="text-sm font-semibold text-slate-500">接案報價指南</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
          接案報價怎麼算？自由工作者避免低估的 5 個步驟
        </h1>
        <p className="mt-5 text-base leading-8 text-slate-600 dark:text-slate-300">
          報價太低不是勤奮，是風險沒有被看見。真正安全的報價，應該同時算進工時、溝通、修改、風險、利潤與維護邊界。
        </p>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/40">
          <h2 className="text-xl font-semibold">快速公式</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
            建議報價 = 預估工時 × 最低時薪 × 風險係數 + 第三方成本 + 維護 / 交接成本
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
            風險係數可先用 1.2～1.8。需求越模糊、時程越急、責任越重，係數越高。
          </p>
        </section>

        <section className="mt-10 space-y-6">
          {steps.map((step) => (
            <div key={step.title} className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
              <h2 className="text-xl font-semibold">{step.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{step.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
          <h2 className="text-xl font-semibold">送出報價前檢查</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
            {checklist.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10 rounded-3xl bg-slate-950 p-6 text-white sm:p-8 dark:bg-slate-100 dark:text-slate-950">
          <h2 className="text-2xl font-semibold">不想從空白文件開始？</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300 dark:text-slate-700">
            好算整理了免費接案 / 工程模板包，包含報價單、成本估算、案場紀錄與請款單。加入好提官方 LINE，回覆「模板」領取。
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={withUtm(HAOTI_LINE_URL, "guide-freelance-pricing")}
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 transition-colors hover:bg-slate-200 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800"
            >
              加入 LINE 領模板
            </a>
            <Link
              href="/templates/freelance-pricing"
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-5 py-3 text-sm font-medium transition-colors hover:border-white dark:border-slate-400 dark:hover:border-slate-950"
            >
              看完整報價模板包
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
