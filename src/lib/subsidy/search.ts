/**
 * 列表與問答共用的搜尋比對。
 *
 * 使用者會這樣打字：「租金 補貼」（中間空一格）、「臺北市」（資料多半寫「台北市」）、
 * 全形的「ＴＰＡＳＳ」、「65 歲」（資料寫「65歲」）。整串照字面比對的話這些全部查不到，
 * 所以兩邊都先正規化，再要求每個詞都出現。
 */

/** 全形轉半形、轉小寫、臺→台、去掉所有空白 */
export function normalizeSearchText(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/臺/g, "台").replace(/\s+/g, "");
}

/** 把輸入用空白切成多個詞；每個詞各自正規化 */
export function searchTerms(query: string): string[] {
  return query
    .normalize("NFKC")
    .trim()
    .split(/\s+/)
    .map(normalizeSearchText)
    .filter(Boolean);
}

/** 預先正規化好的文字裡，是否每個詞都出現。沒有輸入視為全部命中。 */
export function matchesTerms(normalizedHaystack: string, terms: string[]): boolean {
  return terms.every((t) => normalizedHaystack.includes(t));
}
