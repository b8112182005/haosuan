import { describe, it, expect } from "vitest";
import { amountHeadline, amountNeedsDetail } from "../format";

const a = (text: string, min: number | null, max: number | null, unit: string | null) => ({ text, min, max, unit, formula: null });

describe("amountHeadline", () => {
  it("有上下限：2,000～8,000 元/月，單位的括號說明拿掉", () => {
    expect(amountHeadline(a("很長的金額表…", 2000, 8000, "元/月（未加碼之基本上限）"))).toBe("2,000～8,000 元/月");
  });
  it("只有上限：最高 1,500 萬元（萬與元之間不留空格）", () => {
    expect(amountHeadline(a("貸款額度…", null, 15_000_000, "元"))).toBe("最高 1,500 萬元");
  });
  it("上下限相同：3 萬元/胎", () => {
    expect(amountHeadline(a("每名新生兒30,000元", 30000, 30000, "元/胎（一次給）"))).toBe("3 萬元/胎");
  });
  it("全形斜線與點數單位", () => {
    expect(amountHeadline(a("…", 500, 1000, "元／人／月"))).toBe("500～1,000 元/人/月");
    expect(amountHeadline(a("…", 1200, 1800, "點/年"))).toBe("1,200～1,800 點/年");
  });
  it("沒有數字或單位不是金額：取文字的第一句並截短", () => {
    expect(amountHeadline(a("房屋稅 = 房屋評定現值 × 稅率。自住1.2%", null, null, "元／年"))).toBe("房屋稅 = 房屋評定現值 × 稅率");
    expect(amountHeadline(a("全額免繳學費（公立學校註冊時直接免收；私立另計）", null, null, "次"))).toBe("全額免繳學費（公立學校註冊時直接免收");
    expect(amountHeadline(a("", null, null, null))).toBe("依條件而定");
  });
  it("下限是 0 時不寫成 0～N", () => {
    expect(amountHeadline(a("…", 0, 4000, "元/月"))).toBe("最高 4,000 元/月");
  });
});

describe("amountNeedsDetail", () => {
  it("全文比短句多才需要另外顯示", () => {
    expect(amountNeedsDetail(a("每月 5,000 元，第 2 名子女 6,000 元", 5000, 7000, "元/月"))).toBe(true);
    expect(amountNeedsDetail(a("依條件而定", null, null, null))).toBe(false);
  });
});
