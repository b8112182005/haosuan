import type { Metadata } from "next";
import DeadlineCalendar from "@/components/subsidy/DeadlineCalendar";
import { getAllSubsidies } from "@/lib/subsidy/data";

export const metadata: Metadata = {
  title: "年度時程表：報稅、牌照稅、補助申請月份",
  description: "未來 12 個月的政府固定期限：綜所稅、牌照稅、房屋稅、地價稅、租金補貼、勞保紓困貸款、整合住宅補貼等申請與繳納月份，一鍵加入提醒。",
  alternates: { canonical: "/subsidy/calendar" },
};

export default function SubsidyCalendarPage() {
  const subsidies = getAllSubsidies();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">年度時程表</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          未來 12 個月有固定截止日的項目，依月份排列。隨到隨辦的補助不在這裡，到「全部補助」查。
        </p>
      </div>
      <DeadlineCalendar subsidies={subsidies} />
    </div>
  );
}
