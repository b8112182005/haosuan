import type { Metadata } from "next";
import Prose from "@/components/common/Prose";
import { APP_NAME, CONTACT_EMAIL, PROVIDER_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "隱私權政策",
  description: `${APP_NAME} 的隱私權政策：不需要帳號，提醒與試算條件只存在你的裝置，不會上傳。`,
  alternates: { canonical: "/privacy" },
};

const UPDATED = "2026-11-07";

export default function PrivacyPage() {
  return (
    <Prose className="mx-auto max-w-2xl px-4 py-8">
      <h1>隱私權政策</h1>
      <p className="text-sm text-muted-foreground">最後更新：{UPDATED}</p>
      <p>
        {APP_NAME}（以下稱「本服務」）由 {PROVIDER_NAME} 提供，包含 Android app 與網站（{SITE_URL}）。
        本服務不需要註冊帳號，所有功能都可以在不提供任何個人資料的情況下使用。
      </p>

      <h2>一、我們不蒐集什麼</h2>
      <ul>
        <li>不要求姓名、電話、電子郵件、身分證字號或任何帳號登入。</li>
        <li>不讀取通訊錄、位置、相機、麥克風、相簿。</li>
        <li>不在 app 內置入廣告 SDK，也不做跨 app 追蹤。</li>
      </ul>

      <h2>二、只存在你裝置上的資料</h2>
      <ul>
        <li>
          <strong>補助資格試算的回答</strong>（縣市、年齡區間、收入區間、租屋與家庭狀況等）：只在你的裝置上計算比對，
          不會送到任何伺服器。你可以隨時清除。
        </li>
        <li>
          <strong>提醒</strong>（名稱、日期、提前天數、備註）：儲存在裝置的 app 專屬儲存空間，由裝置本機排程通知。
          解除安裝 app 即全部刪除。
        </li>
        <li>
          <strong>計算機輸入值</strong>：只在頁面上計算，不儲存、不上傳。
        </li>
      </ul>

      <h2>三、會連網的情況</h2>
      <ul>
        <li>
          <strong>更新補助資料</strong>：app 會向 {SITE_URL} 下載最新的補助資料檔（純靜態 JSON）。這個請求不帶任何識別資訊。
        </li>
        <li>
          <strong>前往申請</strong>：點「前往申請」會開啟政府機關或其他第三方網站，之後的資料蒐集適用該網站的隱私權政策。
        </li>
        <li>
          <strong>網站版統計</strong>：網站（非 app）在設定 Google Analytics 時會記錄匿名的瀏覽統計；Android app 不包含任何分析工具。
        </li>
        <li>
          <strong>Google Play</strong>：透過 Google Play 安裝與更新時，Google 會依其政策處理安裝與當機資訊，本服務無法取得你的個人身分。
        </li>
      </ul>

      <h2>四、權限說明（Android）</h2>
      <ul>
        <li><strong>通知</strong>：用來在你設定的日期前推送提醒。你可以拒絕，拒絕後提醒功能只剩列表。</li>
        <li><strong>開機完成</strong>：手機重開機後重新排程尚未到期的提醒。</li>
        <li><strong>網路</strong>：更新補助資料與開啟外部連結。</li>
      </ul>

      <h2>五、兒童</h2>
      <p>本服務內容為一般生活資訊，不針對 13 歲以下兒童設計，也不蒐集兒童個人資料。</p>

      <h2>六、資料正確性與免責</h2>
      <p>
        補助條件、金額與期限整理自各主管機關公開資訊，每個項目都標示來源與核對日期。政策會變動，申請前請以主管機關最新公告為準。
        本服務不代辦任何申請，也不收取任何費用。
      </p>

      <h2>七、政策變更</h2>
      <p>政策修改時會更新本頁與最後更新日期；重大變更會在 app 內公告。</p>

      <h2>八、聯絡方式</h2>
      <p>
        對本政策或資料處理有任何問題，請寄信至 <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>。
      </p>
    </Prose>
  );
}
