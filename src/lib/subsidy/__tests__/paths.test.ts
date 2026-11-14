import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { resolveSubsidyPath } from "../paths";

const SRC = path.resolve(__dirname, "../../..");
const full = JSON.parse(fs.readFileSync(path.join(SRC, "data/subsidies.json"), "utf8")) as { items: Array<{ id: string }> };
const ids = JSON.parse(fs.readFileSync(path.join(SRC, "data/subsidy-ids.json"), "utf8")) as string[];

describe("resolveSubsidyPath", () => {
  it("id 清單與完整資料是同一批項目", () => {
    expect(ids).toEqual(full.items.map((i) => i.id));
  });

  it("還在的補助頁原樣回傳（有沒有結尾斜線都算）", () => {
    const id = ids[0];
    expect(resolveSubsidyPath(`/subsidy/${id}`)).toBe(`/subsidy/${id}`);
    expect(resolveSubsidyPath(`/subsidy/${id}/`)).toBe(`/subsidy/${id}/`);
  });

  it("已經不在資料裡的補助頁改導到補助列表", () => {
    expect(resolveSubsidyPath("/subsidy/removed-item-2019")).toBe("/subsidy");
    expect(resolveSubsidyPath("/subsidy/removed-item-2019/")).toBe("/subsidy");
    expect(resolveSubsidyPath("/subsidy/removed-item-2019?from=reminder")).toBe("/subsidy");
  });

  it("試算、問答、時程表這些固定頁不會被當成補助項目", () => {
    for (const page of ["check", "faq", "calendar"]) {
      expect(resolveSubsidyPath(`/subsidy/${page}`)).toBe(`/subsidy/${page}`);
    }
  });

  it("不是補助路徑的原樣回傳", () => {
    expect(resolveSubsidyPath("/reminders")).toBe("/reminders");
    expect(resolveSubsidyPath("/subsidy")).toBe("/subsidy");
    expect(resolveSubsidyPath("/tax/income-tax")).toBe("/tax/income-tax");
    expect(resolveSubsidyPath("https://www.gov.tw/subsidy/x")).toBe("https://www.gov.tw/subsidy/x");
  });
});
