import { describe, expect, it } from "vitest";
import { matchesTerms, normalizeSearchText, searchTerms } from "../search";

const hit = (text: string, query: string) => matchesTerms(normalizeSearchText(text), searchTerms(query));

describe("搜尋比對", () => {
  it("空白分開的每個詞都要出現，順序與中間隔了什麼字不管", () => {
    expect(hit("中央租金補貼：300 億元專案", "租金 補貼")).toBe(true);
    expect(hit("中央租金補貼：300 億元專案", "補貼 租金")).toBe(true);
    expect(hit("中央租金補貼", "租金 育兒")).toBe(false);
  });

  it("臺和台當成同一個字", () => {
    expect(hit("臺北市敬老卡", "台北市")).toBe(true);
    expect(hit("台南市加碼", "臺南")).toBe(true);
  });

  it("全形英數、大小寫、數字和單位之間的空白都不影響", () => {
    expect(hit("TPASS 行政院通勤月票", "ＴＰＡＳＳ")).toBe(true);
    expect(hit("公費 HPV 疫苗", "hpv")).toBe(true);
    expect(hit("年滿65歲的長者", "65 歲")).toBe(true);
    expect(hit("年滿 65 歲的長者", "65歲")).toBe(true);
  });

  it("沒有輸入或只有空白：全部命中", () => {
    expect(searchTerms("   ")).toEqual([]);
    expect(hit("任何文字", "")).toBe(true);
    expect(hit("任何文字", "　")).toBe(true);
  });
});
