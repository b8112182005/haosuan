import type { SubsidyAmount } from "./types";

/**
 * 卡片上的一行金額。資料裡的 amount.text 常是一整段（各縣市、各級距的完整金額表），
 * 放在列表卡片會把畫面撐成十幾屏，所以卡片只顯示由 min／max／unit 組出的短句，
 * 完整文字留在詳情頁。
 */

function formatNumber(n: number): string {
  // 整千的大數字用「萬」，台灣人讀金額的習慣（15,000,000 → 1,500 萬）
  if (n >= 10_000 && n % 1_000 === 0) return `${(n / 10_000).toLocaleString("zh-TW")} 萬`;
  return n.toLocaleString("zh-TW");
}

/**
 * 「元/月（未加碼之基本上限）」→「元/月」；不是金額或點數的單位回 null。
 * 括號裡註明是罰鍰、家長自付、自提、付給院所的金額、門檻時也回 null：
 * 那些數字不是民眾領到的錢，拿來當「補助金額」的標題會誤導（定期檢驗的逾期罰鍰曾顯示成 900～1,800 元）。
 */
function shortUnit(unit: string | null): string | null {
  if (!unit) return "元";
  if (/[（(][^）)]*(罰|自付|自提|院所|門檻)/.test(unit)) return null;
  const u = unit.replace(/[（(].*$/, "").replace(/／/g, "/").replace(/；.*$/, "").trim();
  return /^[元點]/.test(u) ? u : null;
}

function firstClause(text: string, max = 28): string {
  let clause = text.split(/[；;。\n]/)[0].trim();
  // 分號落在括號裡時會切出「全額免繳學費（公立學校註冊時直接免收」這種半截括號，把沒收尾的括號整段拿掉
  const open = clause.lastIndexOf("（");
  if (open > 0 && !clause.slice(open).includes("）")) clause = clause.slice(0, open).trim();
  return clause.length > max ? `${clause.slice(0, max)}…` : clause;
}

export function amountHeadline(amount: SubsidyAmount): string {
  const unit = shortUnit(amount.unit);
  const { min, max } = amount;
  if (unit && max != null && max > 0) {
    // 「1,500 萬」後面直接接「元」，不留空格（1,500 萬元）；一般數字與單位之間留一格
    const withUnit = (n: string) => (n.endsWith("萬") ? `${n}${unit}` : `${n} ${unit}`);
    if (min != null && min > 0 && min !== max) {
      // 兩端一個用「萬」一個不用（1,500～12 萬元）很難讀：這時兩端都寫完整數字
      const lo = formatNumber(min);
      const hi = formatNumber(max);
      if (lo.endsWith("萬") !== hi.endsWith("萬")) return `${min.toLocaleString("zh-TW")}～${max.toLocaleString("zh-TW")} ${unit}`;
      return `${lo}～${withUnit(hi)}`;
    }
    if (min != null && min === max) return withUnit(formatNumber(max));
    return `最高 ${withUnit(formatNumber(max))}`;
  }
  return firstClause(amount.text) || "依條件而定";
}

/** 詳情頁要不要另外顯示完整文字（headline 已經等於全文時不用重複） */
export function amountNeedsDetail(amount: SubsidyAmount): boolean {
  return amount.text.trim().length > 0 && amount.text.trim() !== amountHeadline(amount);
}
