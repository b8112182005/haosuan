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
 * 設 SHOTS_DIR=<資料夾> 會在幾個關鍵畫面存截圖（橫放、平板、錯誤頁、提醒面板），給人眼看版面用。
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

      // 記錄時把很長的字串截短：線上資料檔整份有 1 MB 多，照存會把 localStorage 塞爆
      log({ key, options: JSON.parse(JSON.stringify(o, (k, v) => (typeof v === "string" && v.length > 300 ? `${v.slice(0, 300)}…（共 ${v.length} 字）` : v))) });
      switch (key) {
        case "CapacitorHttp.get":
        case "CapacitorHttp.request": {
          // __remote_mode 沒設＝網站還沒有資料檔（404）；newer＝網站的資料比 app 內建的新，而且牌照稅的金額與期限改了
          if (LS.getItem("__remote_mode") !== "newer") return ok(call, { status: 404, data: "", headers: {}, url: o.url });
          fetch("/data/subsidies.json")
            .then((r) => r.json())
            .then((d) => {
              d.version = "2099-01-01";
              const item = d.items.find((i) => i.id === "vehicle-license-tax-april");
              item.amount = { ...item.amount, text: `${item.amount.text}（測試：金額調整）` };
              item.deadline = { ...item.deadline, end_day: 29, note: "測試：改到 4/29" };
              ok(call, { status: 200, data: d, headers: { "content-type": "application/json" }, url: o.url });
            })
            .catch((e) => fail(call, String(e)));
          return;
        }
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
    "getDeliveredNotifications", "getByIds", "getAll", "removeDeliveredNotifications", "removeDeliveredNotificationsById", "removeAllDeliveredNotifications",
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
  header("CapacitorHttp", ["request", "get", "post", "put", "patch", "delete"]),
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
  const SHOTS_DIR = process.env.SHOTS_DIR;
  if (SHOTS_DIR) fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const shot = async (name, target = page) => {
    if (!SHOTS_DIR) return;
    // 面板滑入的動畫是 200 毫秒，等它停下來再拍
    await target.waitForTimeout(400);
    await target.screenshot({ path: path.join(SHOTS_DIR, `${name}.png`) }).catch(() => {});
  };

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
  // 每年重複的提醒會多排明年同一天那一輪
  const cycles = reminder.repeatYearly ? 2 : 1;
  await check("排了通知，數量不超過提前天數 × 輪數", async () =>
    (scheduled.length > 0 && scheduled.length <= reminder.daysBefore.length * cycles) || { scheduled: scheduled.length, daysBefore: reminder.daysBefore, cycles });
  const [y, m, d] = (reminder.targetDate || "0-0-0").split("-").map(Number);
  // 腳本的 Node 時區不一定是台北，所以用 UTC 換算：台北 09:00 = UTC 01:00
  const fireUtc = (yearOffset, daysBefore) => Date.UTC(y + yearOffset, m - 1, d - daysBefore, 1, 0, 0);
  await check("每則通知：當地早上 9 點、日期 = 期限 − 提前天數、非精確鬧鐘、帶站內連結", async () => {
    const problems = [];
    for (const n of scheduled) {
      const at = new Date(n.schedule.at);
      const expected = [fireUtc(0, n.extra.daysBefore), ...(reminder.repeatYearly ? [fireUtc(1, n.extra.daysBefore)] : [])];
      if (!expected.includes(at.getTime())) problems.push(`時間不對 id=${n.id} at=${n.schedule.at} 預期=${expected.map((t) => new Date(t).toISOString()).join(" 或 ")}`);
      if (n.isExactNotification !== false) problems.push(`id=${n.id} 沒有指定非精確鬧鐘`);
      if (n.schedule.allowWhileIdle !== true) problems.push(`id=${n.id} 沒有 allowWhileIdle`);
      if (n.extra.module !== "reminders" || typeof n.extra.url !== "string" || !n.extra.url.startsWith("/subsidy/")) problems.push(`id=${n.id} extra 不對 ${JSON.stringify(n.extra)}`);
      if (at.getTime() <= Date.now()) problems.push(`id=${n.id} 排在過去`);
      if (!n.title || !n.body) problems.push(`id=${n.id} 沒有標題或內文`);
    }
    if (new Set(scheduled.map((n) => n.id)).size !== scheduled.length) problems.push("id 重複");
    return problems.length === 0 || problems;
  });
  await check("每年固定的期限（牌照稅）：明年同一天那一輪也先排好，每個提前天數各一則", async () => {
    if (!reminder.repeatYearly) return "牌照稅的提醒沒有設成每年重複";
    const nextYear = scheduled.filter((n) => new Date(n.schedule.at).getTime() === fireUtc(1, n.extra.daysBefore));
    return nextYear.length === reminder.daysBefore.length || { nextYear: nextYear.length, daysBefore: reminder.daysBefore };
  });
  await check("通知內文第一行是期限日期", async () => {
    const bad = scheduled.filter((n) => !/^期限 \d{4}\/\d{2}\/\d{2}/.test(n.body));
    return bad.length === 0 || bad.map((n) => n.body);
  });
  await check("通知標題不重複「截止」兩次", async () => {
    const bad = scheduled.filter((n) => (n.title.match(/截止/g) || []).length !== 1);
    return bad.length === 0 || bad.map((n) => n.title);
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
  // 冷啟動用另一則通知：同一則通知只點得到一次（點了就消失），同一則再來一次是系統重送
  const coldTapped = scheduled[1];
  const retainTap = (n) =>
    page.evaluate((notification) => {
      localStorage.setItem("__retained:LocalNotifications:localNotificationActionPerformed", JSON.stringify({ actionId: "tap", notification }));
    }, n);
  if (coldTapped) {
    // 冷啟動：事件在 app 掛監聽器之前就發生，原生端會留到監聽器掛上再送
    await retainTap(coldTapped);
    await page.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
    await settle(1500);
    await check("app 沒開時點通知（冷啟動）：開起來後導到該補助", async () => pathNow().startsWith("/subsidy/vehicle-license-tax-april") || pathNow());

    // Activity 被系統回收後重建，會帶著同一個 Intent，外掛把同一次點擊再送一遍
    await retainTap(coldTapped);
    await page.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
    await settle(1500);
    await check("同一次點擊被系統重送：留在首頁，不再導頁第二次", async () => pathNow() === "/" || pathNow());

    // 重送的是「當初冷啟動 app 的那一則」。中間又點過別則通知之後，重送的那一則仍然要擋得住
    const another = scheduled[2] || tapped;
    await fire("LocalNotifications", "localNotificationActionPerformed", { actionId: "tap", notification: another });
    await settle(1000);
    await retainTap(coldTapped);
    await page.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
    await settle(1500);
    await check("中間點過別則通知之後，當初冷啟動的那一則被重送：仍然留在首頁", async () => pathNow() === "/" || pathNow());
  } else {
    await check("至少排了兩則通知可以測冷啟動", async () => `只排了 ${scheduled.length} 則`);
  }

  // 提醒存的是加入當時的路徑；資料換版後那個補助頁可能已經不在
  await fire("LocalNotifications", "localNotificationActionPerformed", {
    actionId: "tap",
    notification: { id: 987001, title: "舊提醒", body: "", schedule: { at: "2025-01-01T01:00:00.000Z" }, extra: { module: "reminders", url: "/subsidy/removed-item-2019", daysBefore: 0 } },
  });
  await settle(1200);
  await check("點到已下架補助的通知：改到補助列表，不是空白頁或首頁", async () =>
    (/^\/subsidy\/?$/.test(pathNow()) && (await page.locator("main h1").first().isVisible())) || pathNow());

  // 同一件事在提醒頁再測一次：以前提醒頁自己掛了一個不會轉路徑的監聽器，停在這一頁時走的是它
  await tab("提醒");
  await page.waitForURL(/\/reminders/);
  await settle(600);
  await fire("LocalNotifications", "localNotificationActionPerformed", {
    actionId: "tap",
    notification: { id: 987002, title: "舊提醒", body: "", schedule: { at: "2025-01-02T01:00:00.000Z" }, extra: { module: "reminders", url: "/subsidy/removed-item-2020", daysBefore: 0 } },
  });
  await settle(1200);
  await check("停在提醒頁時點到已下架補助的通知：一樣改到補助列表", async () =>
    (/^\/subsidy\/?$/.test(pathNow()) && (await page.locator("main h1").first().isVisible())) || pathNow());

  // 回到前景時再對一次排程（app 常駐背景好幾天，期限過了的每年提醒要推到明年）
  await tab("首頁");
  await page.waitForURL((u) => new URL(u).pathname === "/");
  await settle(400);
  await clearLog();
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await settle(800);
  await check("從背景回到前景：再向原生端對一次排程", async () => (await calls("LocalNotifications.getPending")).length >= 1);

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

  // 8b. 自訂提醒：期限很近時預設的提前天數要自動換成還來得及的 ───────────────────────────────────
  console.log("\n# 自訂提醒");
  await page.getByRole("button", { name: "加入提醒" }).first().click();
  await page.getByLabel("提醒什麼").fill("換濾心");
  // 兩天後（以台北的今天為準）：預設的前 30、14、3 天都已經過了，只剩「當天」來得及
  const inTwoDays = await page.evaluate(() => {
    const t = new Date();
    const x = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 2);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  });
  await page.getByLabel("截止日期").fill(inTwoDays);
  await check("選了兩天後的日期：已經過了的提前天數自動取消，只留還來得及的", async () => {
    const pressed = await page.locator('[role="dialog"] button[aria-pressed="true"]').allInnerTexts();
    return (pressed.length === 1 && pressed[0].includes("當天")) || pressed;
  });
  await shot("reminder-sheet-near-date");
  await page.getByRole("button", { name: "確認加入" }).click();
  await settle(1200);
  const custom = await pendingNow();
  await check("自訂提醒排出 1 則通知，沒有連結時點了會到提醒清單", async () =>
    (custom.length === 1 && custom[0].extra.url === "/reminders" && custom[0].title === "今天截止：換濾心") || custom.map((n) => ({ title: n.title, extra: n.extra })));
  await tab("首頁");
  await page.waitForURL((u) => new URL(u).pathname === "/");
  await settle(400);
  if (custom[0]) {
    await fire("LocalNotifications", "localNotificationActionPerformed", { actionId: "tap", notification: custom[0] });
    await settle(1200);
    await check("點自訂提醒的通知：到提醒清單", async () => /^\/reminders\/?$/.test(pathNow()) || pathNow());
  }
  await tab("提醒");
  await page.waitForURL(/\/reminders/);
  await settle(600);
  await page.getByRole("button", { name: "刪除" }).first().click();
  await page.getByRole("button", { name: "刪除" }).first().click();
  await settle(1000);
  await check("刪掉自訂提醒後沒有殘留的通知", async () => ((await pendingNow()).length === 0 && (await storedReminders()).length === 0) || { pending: (await pendingNow()).length, stored: (await storedReminders()).length });

  // 已經響過的通知：提醒打勾完成之後，要從通知欄收掉（外掛的 cancel 只取消還沒響的鬧鐘）
  await page.getByRole("button", { name: "加入提醒" }).first().click();
  await page.getByLabel("提醒什麼").fill("繳費");
  await page.getByLabel("截止日期").fill(inTwoDays);
  // 手動加選「前 3 天」：它的時間是昨天早上 9 點，等於一則已經響過的通知
  await page.locator('[role="dialog"] button[aria-pressed]', { hasText: "前 3 天" }).click();
  await page.getByRole("button", { name: "確認加入" }).click();
  await settle(1200);
  await clearLog();
  await page.getByRole("checkbox", { name: /標為完成/ }).first().click();
  await settle(1000);
  await check("打勾完成：已經響過的那一則從通知欄收掉，還沒響的取消", async () => {
    const removed = (await calls("LocalNotifications.removeDeliveredNotifications")).flatMap((c) => c.options.notifications.map((n) => n.id));
    const pending = await pendingNow();
    return (removed.length === 1 && Number.isInteger(removed[0]) && pending.length === 0) || { removed, pending: pending.length };
  });
  await page.getByRole("button", { name: "刪除" }).first().click();
  await page.getByRole("button", { name: "刪除" }).first().click();
  await settle(1000);

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

  // 12b. 已打勾完成的每年提醒 ───────────────────────────────────────────────────────────────
  console.log("\n# 已完成的每年提醒");
  await page.evaluate(() => localStorage.removeItem("__pending_no_extra"));
  await page.goto(`${ORIGIN}/subsidy/vehicle-license-tax-april/`, { waitUntil: "networkidle" });
  await settle(800);
  await page.getByRole("button", { name: "加入提醒" }).first().click();
  await page.getByRole("button", { name: "確認加入" }).click();
  await settle(1200);
  const yearlyStored = (await storedReminders())[0] || { targetDate: "", daysBefore: [] };
  const thisYear = Number(yearlyStored.targetDate.slice(0, 4));
  const yearOf = (n) => Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric" }).format(new Date(n.schedule.at)));
  await tab("提醒");
  await page.waitForURL(/\/reminders/);
  await settle(600);
  // 打勾的那一顆是 role="checkbox"
  await page.getByRole("checkbox", { name: /標為完成/ }).first().click();
  await settle(1000);
  await check("打勾完成後：這一期的通知取消，明年那一輪還排著", async () => {
    const pending = await pendingNow();
    const years = pending.map(yearOf);
    return (pending.length === yearlyStored.daysBefore.length && years.every((y) => y === thisYear + 1)) || { years, expect: thisYear + 1 };
  });
  await page.goto(`${ORIGIN}/subsidy/vehicle-license-tax-april/`, { waitUntil: "networkidle" });
  await settle(800);
  await check("補助頁的按鈕顯示「已加入提醒」（明年那一輪還會通知）", async () => page.getByRole("button", { name: "已加入提醒" }).first().isVisible());
  await page.getByRole("button", { name: "已加入提醒" }).first().click();
  await page.getByRole("button", { name: "更新提醒" }).click();
  await check("再存一次：提示寫明這一期已完成，不說「這一期會通知幾次」", async () => {
    await page.getByText("這一期已完成，明年開始通知").first().waitFor({ state: "visible", timeout: 3000 });
  });
  await settle(800);
  await check("存完仍是完成狀態，這一期沒有被排回來", async () => {
    const stored = (await storedReminders())[0];
    const years = (await pendingNow()).map(yearOf);
    return (stored && stored.done === true && years.length > 0 && years.every((y) => y === thisYear + 1)) || { done: stored && stored.done, years };
  });
  await tab("提醒");
  await page.waitForURL(/\/reminders/);
  await settle(600);
  await page.getByRole("button", { name: "刪除" }).first().click();
  await page.getByRole("button", { name: "刪除" }).first().click();
  await settle(1000);
  await check("刪掉之後兩輪通知都取消", async () => (await pendingNow()).length === 0 || (await pendingNow()).map((n) => n.id));

  // 13. 網站上有比 app 內建更新的資料 ─────────────────────────────────────────────────────────
  console.log("\n# 線上資料更新");
  await check("網站還沒有資料檔（404）時，詳情頁照常顯示、不出現更新提示", async () => {
    await page.goto(`${ORIGIN}/subsidy/vehicle-license-tax-april/`, { waitUntil: "networkidle" });
    await settle(1200);
    return (await page.getByText("有較新的資料").count()) === 0 && (await page.locator("h1").first().innerText()).includes("牌照稅");
  });
  await page.evaluate(() => {
    localStorage.setItem("__remote_mode", "newer");
  });
  await clearLog();
  await page.goto(`${ORIGIN}/subsidy/vehicle-license-tax-april/`, { waitUntil: "networkidle" });
  await check("app 用原生 HTTP 抓網站的資料檔", async () => {
    await page.getByText("有較新的資料（2099-01-01）").waitFor({ state: "visible", timeout: 6000 });
    const got = await calls("CapacitorHttp.get");
    return (got.length === 1 && /\/data\/subsidies\.json$/.test(got[0].options.url)) || got;
  });
  await check("金額與期限有變動的項目，頁面頂端列出差異", async () =>
    (await page.getByText("測試：改到 4/29").count()) >= 1 && (await page.getByText("詳細金額已更新").count()) >= 1);
  await clearLog();
  await page.goto(`${ORIGIN}/subsidy/house-tax-may/`, { waitUntil: "networkidle" });
  await settle(1200);
  await check("沒有變動的項目不顯示提示", async () => (await page.getByText("有較新的資料").count()) === 0);
  await check("6 小時內不重複下載資料檔", async () => (await calls("CapacitorHttp.get")).length === 0 || (await calls("CapacitorHttp.get")).length);

  // 14. 外殼：橫放與平板、找不到頁面、hydration、左右安全區 ────────────────────────────────────
  console.log("\n# 外殼");
  await page.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
  await settle(600);
  for (const [label, size] of [["手機橫放 844×390", { width: 844, height: 390 }], ["平板直放 800×1280", { width: 800, height: 1280 }]]) {
    await page.setViewportSize(size);
    await settle(300);
    await check(`${label}：底部分頁列還在、「更多」有入口、Header 不重複出一套導覽`, async () => {
      const tabs = await page.locator("nav.bottom-tabs").isVisible();
      const more = await page.locator('nav.bottom-tabs a[href*="/more"]').isVisible();
      const headerNav = await page.locator("header nav").isVisible();
      const mainPad = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("main")).paddingBottom));
      return (tabs && more && !headerNav && mainPad >= 56) || { tabs, more, headerNav, mainPad };
    });
    await shot(`shell-${size.width}x${size.height}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });

  // Android 15 以上橫放：SystemBars 會把左右的安全區寫到 <html> 的 style
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--safe-area-inset-left", "48px");
    document.documentElement.style.setProperty("--safe-area-inset-right", "24px");
  });
  await check("左右安全區：內容與分頁列各讓出鏡頭開孔與側邊導覽列的寬度", async () => {
    const got = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      const tabs = getComputedStyle(document.querySelector("nav.bottom-tabs"));
      return [body.paddingLeft, body.paddingRight, tabs.paddingLeft, tabs.paddingRight];
    });
    return JSON.stringify(got) === JSON.stringify(["48px", "24px", "48px", "24px"]) || got;
  });
  await page.evaluate(() => {
    document.documentElement.style.removeProperty("--safe-area-inset-left");
    document.documentElement.style.removeProperty("--safe-area-inset-right");
  });

  // 整頁載入「睡眠時間」：以前預設值在 render 用 new Date()，文字和靜態 HTML 對不上，
  // React 重建 <html> 時把 data-platform 一起清掉，網頁版的 Footer 就跑出來
  const errorsBefore = pageErrors.length;
  await page.goto(`${ORIGIN}/life/sleep/`, { waitUntil: "networkidle" });
  await settle(1200);
  await check("整頁載入睡眠時間計算機：沒有 hydration 錯誤，仍是 app 版面", async () => {
    const platform = await page.evaluate(() => document.documentElement.dataset.platform);
    const footer = await page.locator("footer.web-only").isVisible();
    const filled = await page.locator("#time-input").inputValue();
    const newErrors = pageErrors.slice(errorsBefore);
    return (platform === "android" && !footer && /^\d\d:\d\d$/.test(filled) && newErrors.length === 0) || { platform, footer, filled, newErrors };
  });

  // 上面那種情況的後備：React 重建 <html> 會發生在 PlatformScript 跑完之後、effect 執行之前。
  // 這裡在 DOMContentLoaded 把屬性清掉來模擬，NativeBridge 掛載時要把平台寫回去
  const wiped = await context.newPage();
  await wiped.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      document.documentElement.removeAttribute("data-platform");
      window.__platformWiped = true;
    });
  });
  await wiped.goto(`${ORIGIN}/more/index.html`, { waitUntil: "networkidle" });
  await wiped.waitForTimeout(800);
  await check("<html> 的 data-platform 在載入途中被清掉：NativeBridge 補回來，網頁版 Footer 不會跑出來", async () => {
    const got = await wiped.evaluate(() => ({ wiped: window.__platformWiped === true, platform: document.documentElement.dataset.platform }));
    const footer = await wiped.locator("footer.web-only").isVisible();
    return (got.wiped && got.platform === "android" && !footer) || { ...got, footer };
  });
  await wiped.close();

  // 主框架拿到 404 時，真機的 BridgeWebViewClient.onReceivedHttpError 會改載 server.errorPath。這裡照做
  const capConfig = fs.readFileSync(path.join(ROOT, "capacitor.config.ts"), "utf8");
  const errorPath = (capConfig.match(/errorPath:\s*'([^']+)'/) || [])[1];
  await check("capacitor.config.ts 有設 server.errorPath，而且檔案在輸出裡", async () =>
    (!!errorPath && fs.existsSync(path.join(OUT, errorPath))) || `errorPath=${errorPath}`);
  const onResponse = (response) => {
    if (response.status() === 404 && response.request().isNavigationRequest() && response.frame() === page.mainFrame() && errorPath) {
      page.goto(`${ORIGIN}/${errorPath}`).catch(() => {});
    }
  };
  page.on("response", onResponse);
  await page.goto(`${ORIGIN}/subsidy/removed-item-2019/`, { waitUntil: "networkidle" }).catch(() => {});
  await check("整頁載入不存在的路徑：顯示「找不到這一頁」與回去的連結，不是空白", async () => {
    await page.getByRole("heading", { name: "找不到這一頁" }).waitFor({ state: "visible", timeout: 5000 });
    return (await page.getByRole("link", { name: "看補助列表" }).isVisible()) && !(await page.getByRole("heading", { name: "需要更新系統元件" }).isVisible());
  });
  await shot("error-page-missing");

  // 瀏覽紀錄是［…、睡眠計算機、404 的網址、錯誤頁］。退一步會回到 404 的網址、又被帶回錯誤頁，所以錯誤頁要自己退兩步
  await back(true);
  await page.waitForURL(/\/life\/sleep\//, { timeout: 5000 }).catch(() => {});
  await settle(600);
  await check("在錯誤頁按返回鍵：回到出錯前那一頁，不是再看一次錯誤頁", async () =>
    (pathNow().startsWith("/life/sleep") && (await page.locator("nav.bottom-tabs").isVisible())) || page.url());

  await page.goto(`${ORIGIN}/subsidy/removed-item-2019/`, { waitUntil: "networkidle" }).catch(() => {});
  await page.getByRole("heading", { name: "找不到這一頁" }).waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  await page.getByRole("link", { name: "看補助列表" }).click();
  await page.waitForURL(/\/subsidy\/index\.html$/);
  await settle(800);
  await check("從錯誤頁按「看補助列表」回到 app", async () =>
    ((await page.locator("nav.bottom-tabs").isVisible()) && (await page.evaluate(() => document.documentElement.dataset.platform)) === "android") || pathNow());

  // 從補助列表再按返回：紀錄裡的上一筆是 404 的網址，會再被帶到錯誤頁；錯誤頁認得這是回頭路，直接退回出錯前那一頁
  await back(true);
  await page.waitForURL(/\/life\/sleep\//, { timeout: 6000 }).catch(() => {});
  await settle(600);
  await check("從錯誤頁點連結離開後再按返回：不再停在錯誤頁，回到出錯前那一頁", async () =>
    (pathNow().startsWith("/life/sleep") && (await page.getByRole("heading", { name: "找不到這一頁" }).count()) === 0) || page.url());

  // 從錯誤頁點連結離開、沒有按返回、繼續用 app，之後又遇到另一個不存在的頁：要照常顯示說明，不能被當成回頭路跳走
  await page.goto(`${ORIGIN}/subsidy/removed-item-2019/`, { waitUntil: "networkidle" }).catch(() => {});
  await page.getByRole("heading", { name: "找不到這一頁" }).waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  await page.getByRole("link", { name: "看我的提醒" }).click();
  await page.waitForURL(/\/reminders\/index\.html$/);
  await settle(600);
  await tab("工具");
  await page.waitForURL(/\/tools/);
  await settle(400);
  await page.goto(`${ORIGIN}/subsidy/removed-item-2020/`, { waitUntil: "networkidle" }).catch(() => {});
  await check("同一次開 app 第二次遇到不存在的頁：照常顯示「找不到這一頁」", async () => {
    await page.getByRole("heading", { name: "找不到這一頁" }).waitFor({ state: "visible", timeout: 5000 });
  });
  page.off("response", onResponse);

  // Capacitor 的最低 WebView 版本檢查誤判時，會在啟動時直接載入錯誤頁（它是這個 WebView 的第一頁）
  const firstLoad = await context.newPage();
  await firstLoad.goto(`${ORIGIN}/${errorPath}`, { waitUntil: "networkidle" }).catch(() => {});
  await firstLoad.waitForTimeout(1200);
  await check("錯誤頁是啟動後的第一頁、WebView 又夠新：直接進 app 首頁", async () => {
    const p = new URL(firstLoad.url()).pathname;
    return (p === "/" && (await firstLoad.locator("nav.bottom-tabs").isVisible())) || p;
  });
  await firstLoad.close();

  await check("全程沒有未捕捉的 JS 錯誤", async () => pageErrors.length === 0 || pageErrors.slice(0, 5));

  // 15. WebView 太舊（沒有 @layer，Chrome 99 以前）：蓋一層說明，不留壞掉的畫面 ─────────────────────
  const oldContext = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "zh-TW", timezoneId: "Asia/Taipei" });
  await oldContext.addInitScript("delete window.CSSLayerBlockRule;");
  await oldContext.addInitScript(INIT_SCRIPT);
  const oldPage = await oldContext.newPage();
  await oldPage.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
  await check("WebView 不支援 @layer：整頁蓋上「需要更新系統元件」與 Play 商店連結", async () => {
    // Next 自己也有一個 role="alert" 的 route announcer，所以用文字再篩一次
    const alert = oldPage.locator('div[role="alert"]').filter({ hasText: "需要更新系統元件" });
    await alert.waitFor({ state: "visible", timeout: 5000 });
    const text = await alert.innerText();
    const href = await alert.locator("a").getAttribute("href");
    const box = await alert.boundingBox();
    return (text.includes("Android System WebView") && /com\.google\.android\.webview/.test(href) && box.width >= 390 && box.height >= 844) || { text, href, box };
  });
  await shot("old-webview-notice", oldPage);
  await oldPage.goto(`${ORIGIN}/app-error.html`, { waitUntil: "networkidle" });
  await check("錯誤頁在太舊的 WebView 上顯示的是更新說明，不是「找不到這一頁」", async () =>
    (await oldPage.getByRole("heading", { name: "需要更新系統元件" }).isVisible()) && !(await oldPage.getByRole("heading", { name: "找不到這一頁" }).isVisible()));
  await oldContext.close();

  // 16. 網頁版（沒有原生橋接）：提醒頁空清單加第一筆 ─────────────────────────────────────────────
  // Play 上架的 app 不能導去 Play 以外的管道買數位內容，商店說明也寫「無廣告」：推廣與導購只留在網站
  console.log("\n# app 內沒有推廣與導購");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/renovation/paint/", "/finance/insurance/", "/life/electricity/"]) {
    await page.goto(`${ORIGIN}${path}`, { waitUntil: "networkidle" });
    await settle(400);
    await check(`${path}：看不到瑀墨推廣、模板包連結`, async () => {
      const promo = await page.getByText("瑀墨室內設計裝潢").first().isVisible().catch(() => false);
      const links = await page
        .locator('a[href*="/templates/"], a[href*="/free-template"]')
        .evaluateAll((els) => els.filter((el) => el.offsetParent !== null).map((el) => el.getAttribute("href")));
      return (!promo && links.length === 0) || { promo, links };
    });
  }

  console.log("\n# 網頁版");
  const webContext = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "zh-TW", timezoneId: "Asia/Taipei" });
  const webPage = await webContext.newPage();
  const webErrors = [];
  webPage.on("pageerror", (e) => webErrors.push(e.message));
  await webPage.goto(`${ORIGIN}/reminders/index.html`, { waitUntil: "networkidle" });
  await webPage.waitForTimeout(600);
  await webPage.getByRole("button", { name: "加入提醒" }).first().click();
  await webPage.getByLabel("提醒什麼").fill("驗車");
  await webPage.getByLabel("截止日期").fill("2099-03-01");
  await webPage.getByRole("button", { name: "確認加入" }).click();
  await check("網頁版空清單加第一筆：面板停在「已加入提醒」，有 Google 日曆與 .ics", async () => {
    await webPage.getByRole("heading", { name: "已加入提醒" }).waitFor({ state: "visible", timeout: 3000 });
    return (await webPage.getByRole("link", { name: "加入 Google 日曆" }).isVisible()) && (await webPage.getByRole("button", { name: "下載 .ics" }).isVisible());
  });
  await webPage.getByRole("button", { name: "完成" }).click();
  await webPage.waitForTimeout(500);
  await check("按「完成」之後看到清單裡剛加的那一筆", async () =>
    ((await webPage.locator('[role="dialog"]').count()) === 0 && (await webPage.getByText("驗車").first().isVisible()) && webErrors.length === 0) || webErrors);
  await webPage.goto(`${ORIGIN}/renovation/paint/index.html`, { waitUntil: "networkidle" });
  await check("網頁版的油漆計算機仍顯示瑀墨推廣與下一步按鈕", async () =>
    (await webPage.getByText("瑀墨室內設計裝潢").first().isVisible()) && (await webPage.locator('a[href*="/templates/"]').first().isVisible()));
  await webContext.close();

  await browser.close();
  server.close();
  console.log(failures === 0 ? "\n全部通過" : `\n${failures} 項沒過`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
