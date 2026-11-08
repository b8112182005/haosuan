import type { Metadata } from "next";
import Link from "next/link";
import Prose from "@/components/common/Prose";
import { APP_NAME, APP_VERSION, CONTACT_EMAIL, PROVIDER_NAME } from "@/lib/site";
import { CTA_URLS } from "@/lib/brand";
import { DATA_VERSION, getAllSubsidies } from "@/lib/subsidy/data";
import { getEnabledTools } from "@/lib/tools-registry";

export const metadata: Metadata = {
  title: "關於",
  description: `${APP_NAME}：補助查詢、期限提醒、生活計算三合一。資料來源、更新方式與免責說明。`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const subsidies = getAllSubsidies();
  const agencies = Array.from(new Set(subsidies.map((s) => s.agency))).sort();
  const toolCount = getEnabledTools().length;

  return (
    <Prose className="mx-auto max-w-2xl px-4 py-8">
      <h1>關於{APP_NAME}</h1>
      <p>
        {APP_NAME}把三件常被拖延的事放在一起：<strong>查補助</strong>（我符合什麼、能領多少、何時截止）、
        <strong>記期限</strong>（截止前 30、14、3 天通知）、<strong>算數字</strong>（{toolCount} 種台灣常用計算機）。
        不需要帳號，免費，沒有廣告。
      </p>

      <h2>怎麼用</h2>
      <ol>
        <li>到「補助」回答縣市、年齡、收入、租屋與家庭狀況，取得可能符合的項目清單。</li>
        <li>打開項目看資格、金額、要準備的文件、申請步驟與常見卡關。</li>
        <li>按「加入提醒」，截止前會收到通知；按「前往申請」直接到主管機關網頁。</li>
        <li>要算房貸、稅、加班費或換算單位，到「工具」。</li>
      </ol>

      <h2 id="sources">資料來源與更新</h2>
      <p>
        目前補助資料版本：<strong>{DATA_VERSION}</strong>，共 {subsidies.length} 個項目。每個項目頁底部都列出來源網址與核對日期；
        查不到官方依據的欄位會標「未驗證」。資料整理自下列機關的公開資訊：
      </p>
      <ul>
        {agencies.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
      <p>
        app 啟動時會向網站下載最新資料檔，所以不用等 app 更新也能拿到修正後的金額與日期。
        發現錯誤請寄信到 <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>，附上項目名稱與官方來源連結。
      </p>

      <h2>免責說明</h2>
      <ul>
        <li>{APP_NAME}不是政府機關，也不代辦申請、不收費。</li>
        <li>「可能符合」是依你填的條件比對公開資格做的初步判斷，最終以主管機關審核為準。</li>
        <li>金額、門檻、期限會隨年度與政策調整，部分補助採「額滿即止」；送件前請再看一次官方公告。</li>
      </ul>

      <h2>提供者</h2>
      <p>
        {PROVIDER_NAME}。{APP_NAME} v{APP_VERSION}。想用 LINE 收提醒或許願新工具，可以加入{" "}
        <a href={CTA_URLS.lineHomeHero} target="_blank" rel="noopener noreferrer">好提 LINE 官方帳號</a>。
        隱私權政策見 <Link href="/privacy">這裡</Link>。
      </p>
    </Prose>
  );
}
