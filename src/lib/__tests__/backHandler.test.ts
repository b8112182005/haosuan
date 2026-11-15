import { afterEach, describe, expect, it } from "vitest";
import { backHandlerCount, pushBackHandler, runBackHandlers } from "../backHandler";

const cleanups: Array<() => void> = [];
const register = (handler: () => boolean) => {
  const off = pushBackHandler(handler);
  cleanups.push(off);
  return off;
};

afterEach(() => {
  cleanups.splice(0).forEach((off) => off());
  expect(backHandlerCount()).toBe(0);
});

describe("Android 返回鍵攔截堆疊", () => {
  it("沒有人註冊時回 false，交給預設行為（回上一頁或離開 app）", () => {
    expect(runBackHandlers()).toBe(false);
  });

  it("後註冊的先處理：面板疊在精靈上時先關面板", () => {
    const calls: string[] = [];
    register(() => {
      calls.push("wizard");
      return true;
    });
    register(() => {
      calls.push("sheet");
      return true;
    });
    expect(runBackHandlers()).toBe(true);
    expect(calls).toEqual(["sheet"]);
  });

  it("回 false 的處理函式會讓下一層接手", () => {
    const calls: string[] = [];
    register(() => {
      calls.push("lower");
      return true;
    });
    register(() => {
      calls.push("upper");
      return false;
    });
    expect(runBackHandlers()).toBe(true);
    expect(calls).toEqual(["upper", "lower"]);
  });

  it("取消註冊後不再被呼叫", () => {
    let called = 0;
    const off = register(() => {
      called += 1;
      return true;
    });
    off();
    expect(runBackHandlers()).toBe(false);
    expect(called).toBe(0);
    // 重複取消不會誤刪別人的
    register(() => true);
    off();
    expect(backHandlerCount()).toBe(1);
  });

  it("處理函式丟例外時返回鍵不會失效", () => {
    register(() => true);
    register(() => {
      throw new Error("boom");
    });
    expect(runBackHandlers()).toBe(true);
  });
});
