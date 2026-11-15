import type { SubsidyDataset } from "./types";

export interface LocalDataVersion {
  version: string;
  generatedAt: string;
  hash: string;
}

/**
 * 遠端資料是否比 app 內建的新。
 * 版本是日期（YYYY-MM-DD），日期較新就是新。日期相同時可能是同一天稍晚修正後重建的：
 * 內容雜湊不同、而且產生時間比內建的晚才算新；雜湊相同或比較早產生的不算。
 *
 * 這個檔案不 import 內建資料（那邊用 @/ 路徑，單元測試解析不到），內建的版本由呼叫端傳進來。
 */
export function isNewerDataset(remote: Pick<SubsidyDataset, "version" | "generated_at" | "hash">, local: LocalDataVersion): boolean {
  if (remote.version > local.version) return true;
  if (remote.version < local.version) return false;
  if (!remote.hash || !local.hash || remote.hash === local.hash) return false;
  return typeof remote.generated_at === "string" && remote.generated_at > local.generatedAt;
}
