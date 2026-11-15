import type { ReactNode } from "react";

/**
 * 長文頁（隱私權、關於、補助說明）的排版容器。
 * 專案沒有裝 @tailwindcss/typography，所以用任意變體選擇器把子元素樣式集中在這裡。
 */
export default function Prose({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={[
        "text-[15px] leading-relaxed text-foreground",
        "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight sm:[&_h1]:text-3xl",
        "[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:scroll-mt-24",
        "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold",
        "[&_p]:my-3 [&_p]:text-muted-foreground",
        "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:text-muted-foreground",
        "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_ol]:text-muted-foreground",
        "[&_li>strong]:text-foreground [&_p>strong]:text-foreground",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
        "[&_table]:my-4 [&_table]:w-full [&_table]:text-sm [&_th]:border-b [&_th]:py-2 [&_th]:text-left [&_td]:border-b [&_td]:py-2 [&_td]:align-top",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
