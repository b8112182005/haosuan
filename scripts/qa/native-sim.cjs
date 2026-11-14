/* eslint-disable @typescript-eslint/no-require-imports -- 獨立執行的 Node 腳本（CommonJS），不進 Next 的編譯 */
/**
 * 模擬 Capacitor Android 原生端，對靜態輸出（out/）跑端對端檢查。
 *
 * 為什麼需要：返回鍵、本機通知排程、通知點擊這幾條路徑只在 WebView 裡有原生橋接時才會執行，
 * 一般的瀏覽器測試跑不到，CI 也沒有 Android 模擬器。這支腳本在 Chromium 裡做三件事來補這一塊：
 *   1. 起一個行為和 Capacitor 本機伺服器相同的靜態伺服器（沒有副檔名的路徑一律回根目錄 index.html）。
 *   2. 在每個頁面載入前注入 @capacitor/android 自己的 native-bridge.js，並提供假的 window.androidBridge，
 *      所以 app 內的 @capacitor/core 會走和真機相同的 JS 路徑（nativePromise／nativeCallback／fromNative）。
 *   3. 假的原生端記下每一次外掛呼叫，並能主動送事件（返回鍵、點擊通知）。
 *
 * 驗不到的：系統實際響鈴的時間、通知外觀、edge-to-edge 版面、Chrome Custom Tabs。這些仍要實機確認。
 *
 * 用法：npm run build:app && node scripts/qa/native-sim.cjs
 * 需要 playwright（CI 或本機自行安裝；找不到時設 NODE_PATH 指到裝有 playwright 的 node_modules）。
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "out");
const PORT = Number(process.env.PORT || 4189);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const BRIDGE_JS = fs.readFileSync(
  path.join(ROOT, "node_modules/@capacitor/android/capacitor/src/main/assets/native-bridge.js"),
  "utf8",
);

if (!fs.existsSync(path.join(OUT, "index.html"))) {
  console.error("找不到 out/index.html，請先跑 npm run build:app");
  process.exit(2);
}

// ── 假的原生端（在頁面內執行；狀態放 localStorage，換頁後還在，等同原生端的持久狀態） ──────────
function fakeNative() {
  const LS = window.localStorage;
  const readJson = (key, fallback) => {
    try {
      const v = LS.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  };
  const log = (entry) => {
    const all = readJson("__native_log", []);
    all.push(entry);
    LS.setItem("__native_log", JSON.stringify(all));
  };
  const listeners = {};
  const send = (callbackId, pluginId, methodName, data, error, save) =>
    setTimeout(() => {
      window.Capacitor.fromNative({ callbackId, pluginId, methodName, success: !error, data, error, save });
    }, 0);
  const ok = (call, data) => send(call.callbackId, call.pluginId, call.methodName, data === undefined ? {} : data, undefined, false);
  const fail = (call, message) => send(call.callbackId, call.pluginId, call.methodName, undefined, { message }, false);
  const pending = () => readJson("__pending", []);
  const permission = () => LS.getItem("__perm") || "prompt";

  window.androidBridge = {
    postMessage(json) {
      const call = JSON.parse(json);
      const o = call.options || {};
      const key = `${call.pluginId}.${call.methodName}`;

      if (call.methodName === "addListener") {
        const slot = `${call.pluginId}:${o.eventName}`;
        (listeners[slot] = listeners[slot] || []).push(call.callbackId);
        log({ key, event: o.eventName });
        // 真機上 app 還沒掛監聽器時發生的事件會留著，掛上後補送（notifyListeners 的 retainUntilConsumed）
        const retained = readJson(`__retained:${slot}`, null);
        if (retained) {
          LS.removeItem(`__retained:${slot}`);
          send(call.callbackId, call.pluginId, "addListener", retained, undefined, true);
        }
        return;
      }
      if (call.methodName === "removeListener") {
        const arr = listeners[`${call.pluginId}:${o.eventName}`] || [];
        const i = arr.indexOf(o.callbackId);
        if (i >= 0) arr.splice(i, 1);
        return;
      }

      log({ key, options: o });
      switch (key) {
        case "Preferences.get":
          return ok(call, { value: LS.getItem(`__pref:${o.key}`) });
        case "Preferences.set":
          LS.setItem(`__pref:${o.key}`, String(o.value));
          return ok(call);
        case "Preferences.remove":
          LS.removeItem(`__pref:${o.key}`);
          return ok(call);
        case "LocalNotifications.checkPermissions":
          return ok(call, { display: permission() });
        case "LocalNotifications.requestPermissions": {
          const answer = LS.getItem("__perm_answer") || "granted";
          LS.setItem("__perm", answer);
          return ok(call, { display: answer });
        }
        case "LocalNotifications.getPending":
          // __pending_no_extra 模擬部分機型回來的資料沒有 extra
          return ok(call, {
            notifications: pending().map((n) => (LS.getItem("__pending_no_extra") ? { id: n.id, title: n.title, body: n.body } : n)),
          });
        case "LocalNotifications.cancel": {
          const ids = new Set((o.notifications || []).map((n) => n.id));
          LS.setItem("__pending", JSON.stringify(pending().filter((n) => !ids.has(n.id))));
          return ok(call);
        }
        case "LocalNotifications.schedule": {
          // 真機（Android 13+）在權限不是 granted 時會自己跳系統權限視窗；app 應該先問過才呼叫
          if (permission() !== "granted") log({ violation: "權限不是 granted 就呼叫 schedule（真機會在這時跳出權限視窗）" });
          const list = o.notifications || [];
          for (const n of list) {
            if (!Number.isInteger(n.id) || n.id <= 0 || n.id > 2147483647) return fail(call, `id 不是 32-bit 正整數：${n.id}`);
            const at = n.schedule && n.schedule.at;
            if (typeof at !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(at)) return fail(call, `schedule.at 格式不對：${at}`);
          }
          const ids = new Set(list.map((n) => n.id));
          LS.setItem("__pending", JSON.stringify(pending().filter((n) => !ids.has(n.id)).concat(list)));
          return ok(call, { notifications: list.map((n) => ({ id: n.id })) });
        }
        case "App.exitApp":
          LS.setItem("__exited", String(Number(LS.getItem("__exited") || 0) + 1));
          return ok(call);
        case "Network.getStatus":
          return ok(call, { connected: true, connectionType: "wifi" });
        case "Share.canShare":
          return ok(call, { value: true });
        default:
          return ok(call);
      }
    },
  };

  /** 測試腳本用：從「原生端」送事件給 app 掛的監聽器，回傳監聽器數量 */
  window.__fireNative = (plugin, eventName, data) => {
    const ids = listeners[`${plugin}:${eventName}`] || [];
    for (const id of ids) send(id, plugin, "addListener", JSON.parse(JSON.stringify(data)), undefined, true);
    return ids.length;
  };

  // 以下三行對應真機 JSInjector 注入的 globalJS 與 localUrlJS，native-bridge.js 接在後面
  window.Capacitor = { DEBUG: false, isLoggingEnabled: false, Plugins: {} };
  window.WEBVIEW_SERVER_URL = window.location.origin;
}

const header = (name, methods) => ({
  name,
  methods: [
    { name: "addListener", rtype: "none" },
    { name: "removeListener", rtype: "none" },
    { name: "removeAllListeners", rtype: "promise" },
    ...methods.map((m) => ({ name: m, rtype: "promise" })),
  ],
});
// 方法名稱取自各外掛 Android 原始碼的 @PluginMethod；app 呼叫了這裡沒有的方法會丟「not implemented」，等於順便檢查拼字
const PLUGIN_HEADERS = [
  header("App", ["exitApp", "getInfo", "getState", "getLaunchUrl", "minimizeApp", "toggleBackButtonHandler"]),
  header("Browser", ["open", "close"]),
  header("Preferences", ["configure", "get", "set", "remove", "clear", "keys", "migrate", "removeOld"]),
  header("LocalNotifications", [
    "schedule", "update", "cancel", "cancelAll", "getPending", "registerActionTypes", "areEnabled",
    "getDeliveredNotifications", "removeDeliveredNotifications", "removeAllDeliveredNotifications",
    "createChannel", "deleteChannel", "listChannels", "checkPermissions", "requestPermissions",
    "changeExactNotificationSetting", "checkExactNotificationSetting",
  ]),
  header("Network", ["getStatus"]),
  header("Share", ["canShare", "share"]),
  header("Clipboard", ["write", "read"]),
  header("Haptics", ["impact", "notification", "vibrate", "selectionStart", "selectionChanged", "selectionEnd"]),
  header("SplashScreen", ["show", "hide"]),
  header("StatusBar", ["setStyle", "setBackgroundColor", "show", "hide", "getInfo", "setOverlaysWebView"]),
  header("SystemBars", ["setStyle", "show", "hide", "setAnimation"]),
];
const INIT_SCRIPT = `(${fakeNative.toString()})();\n${BRIDGE_JS}\nwindow.Capacitor.PluginHeaders = ${JSON.stringify(PLUGIN_HEADERS)};`;

// ── 與 Capacitor 本機伺服器相同行為的靜態伺服器 ──────────────────────────────────────────────
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".css": "text/css", ".json": "application/json",
  ".txt": "text/plain; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2",
};
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, ORIGIN).pathname);
  const last = pathname.split("/").filter(Boolean).pop() || "";
  const file = pathname === "/" || !last.includes(".") ? path.join(OUT, "index.html") : path.join(OUT, pathname);
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(buf);
  });
});

// ── 檢查 ────────────────────────────────────────────────────────────────────────────────────
let failures = 0;
async function check(label, fn) {
  try {
    const result = await fn();
    if (result === true || result === undefined) console.log("ok  ", label);
    else {
      failures += 1;
      console.log("FAIL", label, "→", typeof result === "string" ? result : JSON.stringify(result));
    }
  } catch (err) {
    failures += 1;
    console.log("FAIL", label, "→", String(err && err.message ? err.message : err).split("\n")[0]);
  }
}

async function main() {
  await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
  const browser = await chromium.launch();
  // 時區固定台北：通知排在「當地早上 9 點」，換算成 UTC 要是前一天的 01:00
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "zh-TW", timezoneId: "Asia/Taipei" });
  await context.addInitScript(INIT_SCRIPT);
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  const popups = [];
  context.on("page", (p) => {
    if (p !== page) popups.push(p.url());
  });

  const nativeLog = () => page.evaluate(() => JSON.parse(localStorage.getItem("__native_log") || "[]"));
  const calls = async (key) => (await nativeLog()).filter((e) => e.key === key);
  const clearLog = () => page.evaluate(() => localStorage.removeItem("__native_log"));
  const pendingNow = () => page.evaluate(() => JSON.parse(localStorage.getItem("__pending") || "[]"));
  const exited = () => page.evaluate(() => Number(localStorage.getItem("__exited") || 0));
  const fire = (plugin, event, data) => page.evaluate(([p, e, d]) => window.__fireNative(p, e, d), [plugin, event, data]);
  const back = (canGoBack = true) => fire("App", "backButton", { canGoBack });
  const pathNow = () => new URL(page.url()).pathname.replace(/index\.html$/, "");
  const tab = (label) => page.locator("nav.bottom-tabs a", { hasText: label }).click();
  const settle = (ms = 500) => page.waitForTimeout(ms);
  const storedReminders = () => page.evaluate(() => JSON.parse(localStorage.getItem("__pref:haoti.reminders.v1") || "[]"));

  // 1. 啟動 ────────────────────────────────────────────────────────────────────────────────
  console.log("\n# 啟動");
  await page.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
  await settle(800);
  await check("app 認得自己在 Android 原生環境", async () =>
    (await page.evaluate(() => document.documentElement.dataset.platform)) === "android");
  await check("掛上返回鍵監聽", async () => (await calls("App.addListener")).some((e) => e.event === "backButton"));
  await check("掛上通知點擊監聽", async () =>
    (await calls("LocalNotifications.addListener")).some((e) => e.event === "localNotificationActionPerformed"));
  await check("啟動時向原生端對過一次排程（getPending）", async () => (await calls("LocalNotifications.getPending")).length >= 1);
  await check("啟動時沒有跳通知權限視窗", async () => {
    const log = await nativeLog();
    const bad = log.filter((e) => e.key === "LocalNotifications.requestPermissions" || e.key === "LocalNotifications.schedule" || e.violation);
    return bad.length === 0 || bad;
  });

  // 2. 首頁按返回鍵 ──────────────────────────────────────────────────────────────────────────
  console.log("\n# 返回鍵");
  await back(false);
  await settle(300);
  await check("首頁按返回鍵離開 app", async () => (await exited()) === 1 || `exitApp 次數 ${await exited()}`);

  // 3. 詳情頁：面板開著按返回鍵 ──────────────────────────────────────────────────────────────
  await page.goto(`${ORIGIN}/subsidy/vehicle-license-tax-april/`, { waitUntil: "networkidle" });
  await settle(800);
  const detailPath = pathNow();
  await check("整頁載入詳情頁顯示正確內容", async () => (await page.locator("h1").first().innerText()).includes("牌照稅") || (await page.locator("h1").first().innerText()));
  await page.getByRole("button", { name: "加入提醒" }).first().click();
  await check("加入提醒面板打開", async () => page.locator('[role="dialog"]').isVisible());
  await back(true);
  await settle(400);
  await check("面板開著按返回鍵：只關面板", async () => !(await page.locator('[role="dialog"]').isVisible()));
  await check("面板關掉後仍在原本的頁面、app 沒有離開", async () => (pathNow() === detailPath && (await exited()) === 1) || { path: pathNow(), exited: await exited() });

  // 4. 加入提醒：先問權限，再排通知 ──────────────────────────────────────────────────────────
  console.log("\n# 加入提醒與通知排程");
  await clearLog();
  await page.getByRole("button", { name: "加入提醒" }).first().click();
  await page.getByRole("button", { name: "確認加入" }).click();
  await settle(1200);
  await check("按確認時才要求通知權限", async () => (await calls("LocalNotifications.requestPermissions")).length === 1);
  await check("沒有在權限未開時呼叫 schedule", async () => (await nativeLog()).filter((e) => e.violation).length === 0);
  const reminders = await storedReminders();
  await check("提醒存進 Preferences", async () => reminders.length === 1 || reminders.length);
  const reminder = reminders[0] || { daysBefore: [], targetDate: "" };
  const scheduled = await pendingNow();
  await check("排了通知，數量不超過提前天數的數量", async () =>
    (scheduled.length > 0 && scheduled.length <= reminder.daysBefore.length) || { scheduled: scheduled.length, daysBefore: reminder.daysBefore });
  await check("每則通知：當地早上 9 點、日期 = 期限 − 提前天數、非精確鬧鐘、帶站內連結", async () => {
    const problems = [];
    const [y, m, d] = reminder.targetDate.split("-").map(Number);
    for (const n of scheduled) {
      const at = new Date(n.schedule.at);
      // 腳本的 Node 時區不一定是台北，所以用 UTC 換算：台北 09:00 = UTC 01:00
      const expected = Date.UTC(y, m - 1, d - n.extra.daysBefore, 1, 0, 0);
      if (at.getTime() !== expected) problems.push(`時間不對 id=${n.id} at=${n.schedule.at} 預期=${new Date(expected).toISOString()}`);
      if (n.isExactNotification !== false) problems.push(`id=${n.id} 沒有指定非精確鬧鐘`);
      if (n.schedule.allowWhileIdle !== true) problems.push(`id=${n.id} 沒有 allowWhileIdle`);
      if (n.extra.module !== "reminders" || typeof n.extra.url !== "string" || !n.extra.url.startsWith("/subsidy/")) problems.push(`id=${n.id} extra 不對 ${JSON.stringify(n.extra)}`);
      if (at.getTime() <= Date.now()) problems.push(`id=${n.id} 排在過去`);
      if (!n.title || !n.body) problems.push(`id=${n.id} 沒有標題或內文`);
    }
    if (new Set(scheduled.map((n) => n.id)).size !== scheduled.length) problems.push("id 重複");
    return problems.length === 0 || problems;
  });
  await check("按鈕變成「已加入提醒」", async () => page.getByRole("button", { name: "已加入提醒" }).first().isVisible());

  // 5. 外部連結 ─────────────────────────────────────────────────────────────────────────────
  console.log("\n# 外部連結");
  await clearLog();
  const external = page.locator('main a[href^="http"]').first();
  const externalHref = await external.getAttribute("href");
  await external.click();
  await settle(500);
  await check("外部連結交給 Browser 外掛（Chrome Custom Tabs）", async () => {
    const opens = await calls("Browser.open");
    return (opens.length === 1 && opens[0].options.url === externalHref) || { opens, externalHref };
  });
  await check("WebView 沒有被帶離 app，也沒有另開視窗", async () => (pathNow() === detailPath && popups.length === 0) || { path: pathNow(), popups });

  // 6. 點通知 → 導到提醒帶的頁面 ───────────────────────────────────────────────────────────
  console.log("\n# 點擊通知");
  await tab("首頁");
  await page.waitForURL((u) => new URL(u).pathname === "/");
  await settle(500);
  const tapped = scheduled[0];
  if (tapped) {
    await fire("LocalNotifications", "localNotificationActionPerformed", { actionId: "tap", notification: tapped });
    await settle(1200);
    await check("app 開著時點通知：站內換頁到該補助", async () =>
      (pathNow().startsWith("/subsidy/vehicle-license-tax-april") && (await page.locator("h1").first().innerText()).includes("牌照稅")) || pathNow());
  }
  if (tapped) {
    // 冷啟動：事件在 app 掛監聽器之前就發生，原生端會留到監聽器掛上再送
    await page.evaluate((n) => {
      localStorage.setItem("__retained:LocalNotifications:localNotificationActionPerformed", JSON.stringify({ actionId: "tap", notification: n }));
    }, tapped);
    await page.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
    await settle(1500);
    await check("app 沒開時點通知（冷啟動）：開起來後導到該補助", async () => pathNow().startsWith("/subsidy/vehicle-license-tax-april") || pathNow());
  }

  // 7. 試算精靈的返回鍵 ──────────────────────────────────────────────────────────────────────
  console.log("\n# 試算精靈");
  await tab("補助");
  await page.waitForURL(/\/subsidy\/?$/);
  await settle(400);
  await page.locator('a[href*="/subsidy/check"]').first().click();
  await page.waitForURL(/\/subsidy\/check/);
  await settle(600);
  const progress = () => page.getByText(/第 \d+ \/ \d+ 題/).first().innerText();
  await check("精靈從第 1 題開始", async () => (await progress()).startsWith("第 1 /") || (await progress()));
  await page.getByRole("button", { name: /下一題/ }).click();
  await page.getByRole("button", { name: /下一題/ }).click();
  await check("按兩次下一題到第 3 題", async () => (await progress()).startsWith("第 3 /") || (await progress()));
  await back(true);
  await settle(300);
  await check("第 3 題按返回鍵回第 2 題", async () => (await progress()).startsWith("第 2 /") || (await progress()));
  await back(true);
  await settle(300);
  await check("再按回第 1 題，仍在試算頁", async () => ((await progress()).startsWith("第 1 /") && pathNow().startsWith("/subsidy/check")) || pathNow());
  await back(true);
  await page.waitForURL(/\/subsidy\/?$/, { timeout: 5000 }).catch(() => {});
  await check("第 1 題按返回鍵離開試算，回到補助列表", async () => /^\/subsidy\/?$/.test(pathNow()) || pathNow());

  // 8. 刪除提醒 → 取消通知 ──────────────────────────────────────────────────────────────────
  console.log("\n# 刪除提醒");
  await tab("提醒");
  await page.waitForURL(/\/reminders/);
  await settle(800);
  await check("提醒頁列出剛加的提醒", async () => page.getByText("牌照稅").first().isVisible());
  await clearLog();
  await page.getByRole("button", { name: "刪除" }).first().click();
  await page.getByRole("button", { name: "刪除" }).first().click();
  await settle(1000);
  await check("刪除後原生端沒有殘留的通知", async () => (await pendingNow()).length === 0 || (await pendingNow()).map((n) => n.id));
  await check("刪除時有呼叫 cancel 並帶到原本排的 id", async () => {
    const cancelled = new Set((await calls("LocalNotifications.cancel")).flatMap((c) => c.options.notifications.map((n) => n.id)));
    return scheduled.every((n) => cancelled.has(n.id)) || { cancelled: [...cancelled], scheduled: scheduled.map((n) => n.id) };
  });
  await check("Preferences 裡的提醒清空", async () => (await storedReminders()).length === 0);

  // 9. 權限被拒 ─────────────────────────────────────────────────────────────────────────────
  console.log("\n# 通知權限被拒");
  await page.evaluate(() => {
    localStorage.setItem("__perm", "denied");
  });
  await page.goto(`${ORIGIN}/subsidy/house-tax-may/`, { waitUntil: "networkidle" });
  await settle(800);
  await clearLog();
  await page.getByRole("button", { name: "加入提醒" }).first().click();
  await page.getByRole("button", { name: "確認加入" }).click();
  // 提示只顯示 2 秒，要用 waitFor 等它出現，isVisible 不會等
  await check("提示通知權限沒開", async () => {
    await page.getByText("通知權限沒開").first().waitFor({ state: "visible", timeout: 3000 });
  });
  await settle(800);
  await check("權限被拒時不呼叫 schedule，也不重複跳權限視窗", async () => {
    const log = await nativeLog();
    const bad = log.filter((e) => e.key === "LocalNotifications.schedule" || e.key === "LocalNotifications.requestPermissions" || e.violation);
    return bad.length === 0 || bad;
  });
  await check("提醒仍然存下來", async () => (await storedReminders()).length === 1);
  await tab("提醒");
  await page.waitForURL(/\/reminders/);
  await settle(800);
  await check("提醒頁說明去哪裡開通知，app 名稱是「好耶」", async () => page.getByText("應用程式 → 好耶 → 通知").isVisible());

  // 10. 使用者到系統設定開了通知，回到 app ─────────────────────────────────────────────────────
  console.log("\n# 之後開啟權限、啟動補排");
  await page.evaluate(() => {
    localStorage.setItem("__perm", "granted");
  });
  await page.getByRole("button", { name: "我已開啟，重新檢查" }).click();
  await settle(1200);
  await check("開啟權限後自動補排通知", async () => (await pendingNow()).length > 0);

  // 11. 排程被系統清掉（強制停止）後重新開 app ─────────────────────────────────────────────────
  const before = (await pendingNow()).map((n) => n.id).sort();
  await page.evaluate(() => {
    localStorage.removeItem("__pending");
  });
  await page.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
  await settle(1500);
  await check("系統清掉排程後，下次開 app 在首頁就補回同一組通知", async () => {
    const after = (await pendingNow()).map((n) => n.id).sort();
    return JSON.stringify(after) === JSON.stringify(before) || { before, after };
  });

  // 12. 部分機型 getPending 不回 extra：刪除時仍要取消乾淨 ───────────────────────────────────────
  await page.evaluate(() => {
    localStorage.setItem("__pending_no_extra", "1");
  });
  await tab("提醒");
  await page.waitForURL(/\/reminders/);
  await settle(800);
  await page.getByRole("button", { name: "刪除" }).first().click();
  await page.getByRole("button", { name: "刪除" }).first().click();
  await settle(1000);
  await check("getPending 沒有 extra 時，刪除提醒仍取消全部通知", async () => (await pendingNow()).length === 0 || (await pendingNow()).map((n) => n.id));

  await check("全程沒有未捕捉的 JS 錯誤", async () => pageErrors.length === 0 || pageErrors.slice(0, 5));

  await browser.close();
  server.close();
  console.log(failures === 0 ? "\n全部通過" : `\n${failures} 項沒過`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
