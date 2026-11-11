import type { Metadata } from "next";
import Link from "next/link";
import {
  Info,
  ShieldCheck,
  Database,
  MessageCircle,
  Mail,
  FileText,
  ChevronRight,
  Bell,
  Landmark,
} from "lucide-react";
import ShareAppButton from "@/components/app/ShareAppButton";
import { APP_NAME, APP_VERSION, CONTACT_EMAIL } from "@/lib/site";
import { CTA_URLS } from "@/lib/brand";
import { DATA_VERSION } from "@/lib/subsidy/data";

export const metadata: Metadata = {
  title: "更多",
  description: "關於好耶、隱私權政策、資料來源、意見回饋。",
  robots: { index: false, follow: true },
};

const sections = [
  {
    title: "功能",
    items: [
      { icon: Landmark, label: "補助資格試算", desc: "回答 7 題，列出你可能符合的補助", href: "/subsidy/check" },
      { icon: Bell, label: "我的提醒", desc: "截止前 30、14、3 天通知", href: "/reminders" },
      { icon: FileText, label: "年度時程表", desc: "報稅、牌照稅、補助申請月份一覽", href: "/subsidy/calendar" },
    ],
  },
  {
    title: "資訊",
    items: [
      { icon: Info, label: "關於好耶", desc: "誰在做、怎麼用、免責說明", href: "/about" },
      { icon: Database, label: "資料來源與更新", desc: `補助資料版本 ${DATA_VERSION}`, href: "/about#sources" },
      { icon: ShieldCheck, label: "隱私權政策", desc: "不需帳號，提醒只存在你的手機", href: "/privacy" },
    ],
  },
  {
    title: "聯絡",
    items: [
      { icon: MessageCircle, label: "好提 LINE 官方帳號", desc: "用 LINE 收補助提醒、留言許願新工具", href: CTA_URLS.lineHomeHero, external: true },
      { icon: Mail, label: "意見回饋", desc: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${APP_NAME} 意見回饋`)}`, external: true },
    ],
  },
];

export default function MorePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">更多</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {APP_NAME} v{APP_VERSION}
      </p>

      <div className="mt-6 space-y-6">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </h2>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {section.items.map((item) => {
                const Icon = item.icon;
                const inner = (
                  <>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                      <Icon className="h-4 w-4 text-foreground/80" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{item.desc}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </>
                );
                const cls = "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40 active:bg-accent/60";
                return (
                  <li key={item.label}>
                    {"external" in item && item.external ? (
                      <a href={item.href} className={cls} target="_blank" rel="noopener noreferrer">
                        {inner}
                      </a>
                    ) : (
                      <Link href={item.href} className={cls}>
                        {inner}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <ShareAppButton />
        <p className="text-xs text-muted-foreground">
          資料整理自政府公開資訊，申請條件與金額以各主管機關最新公告為準。
        </p>
      </div>
    </div>
  );
}
