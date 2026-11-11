import type { Metadata } from 'next';
import RemindersClient from '@/components/reminders/RemindersClient';

export const metadata: Metadata = {
  title: '我的提醒',
  description:
    '補助截止、繳稅、驗車、換濾心的提醒清單。資料只存在你的手機或瀏覽器裡，不會上傳到任何伺服器；好算 App 會在截止前 30、14、3 天與當天早上 9 點推播。',
  // 內容全在使用者裝置上，搜尋引擎抓到的只是空殼
  robots: { index: false, follow: true },
};

export default function RemindersPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <RemindersClient />
    </div>
  );
}
