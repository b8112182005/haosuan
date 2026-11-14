import ids from "../../data/subsidy-ids.json";

/**
 * 判斷站內的補助路徑在這一版 app 裡還在不在。
 *
 * 提醒存的是加入當時的站內路徑。資料換版後那一筆可能改了 id 或下架（帶年份的 id 每年都會換），
 * app 是靜態輸出，導到不存在的路徑會落到 404 頁。這裡把已經不存在的補助路徑換成補助列表。
 *
 * 只 import id 清單（約 3 KB），提醒頁和每一頁都會載入的 NativeBridge 才用得起。
 * 用相對路徑：vitest 沒設 @/ alias。
 */
const SUBSIDY_IDS = new Set(ids as string[]);

/** /subsidy 底下不是補助項目的固定頁面 */
const SUBSIDY_STATIC_PAGES = new Set(["check", "faq", "calendar"]);

export function resolveSubsidyPath(url: string): string {
  const match = /^\/subsidy\/([^/?#]+)\/?(?:[?#].*)?$/.exec(url);
  if (!match) return url;
  if (SUBSIDY_STATIC_PAGES.has(match[1]) || SUBSIDY_IDS.has(match[1])) return url;
  return "/subsidy";
}
