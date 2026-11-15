// 在任何 React 程式跑之前執行的同步腳本，做三件事。只用舊版瀏覽器也看得懂的語法（var、function、字串相加）：
// 第 3 件事要在新語法解析失敗的 WebView 上也能執行。
//
// 1. 把平台寫到 <html data-platform>，讓 globals.css 的 .web-only / .app-only 規則在首次繪製時就生效
//    （不會閃一下網頁版的 Footer）。Capacitor 的原生橋接在 document start 就注入 window.Capacitor，所以讀得到。
//
// 2. Capacitor 的本機伺服器對「沒有副檔名的路徑」一律回根目錄的 index.html（html5mode）。
//    平常用 <Link> 換頁走的是 RSC 的 .txt 檔，不受影響；但 Next 在 RSC 請求失敗時會退回整頁載入，
//    這時 /subsidy/check/ 拿到的會是首頁的 HTML。偵測到這種情況就改載入該路徑自己的 index.html
//    （有副檔名，本機伺服器會回正確的檔案；檔案不存在時 Capacitor 會改載 app-error.html）。
//    網頁版的伺服器會回正確的頁面，不需要這段。
//
//    每一頁也順手在 sessionStorage 記下 haoye.booted：app-error.html 靠它分辨「app 已經開起來之後才遇到 404」
//    和「一啟動就被載入錯誤頁」（後者直接導回首頁）。
//
// 3. 樣式全部包在 @layer 裡（Tailwind 4），Chrome／WebView 99 以前不認得，整頁沒有版面：圖示放到整個螢幕寬、
//    分頁列疊在內容上。關掉自動更新的 Android 8、9 手機會遇到。CSSLayerBlockRule 是同一版才有的介面，
//    沒有它就蓋一層說明，告訴使用者要更新什麼，不要留一個壞掉的畫面。
const code =
  "(function(){try{try{window.sessionStorage.setItem('haoye.booted','1');}catch(s){}" +
  "var c=window.Capacitor;var n=!!(c&&typeof c.isNativePlatform==='function'&&c.isNativePlatform());" +
  "document.documentElement.setAttribute('data-platform',n?c.getPlatform():'web');" +
  "if(n){var p=location.pathname;if(p!=='/'&&!/\\.html$/.test(p)){location.replace(p.replace(/\\/?$/,'/')+'index.html'+location.search+location.hash);return;}}" +
  "if(typeof window.CSSLayerBlockRule==='undefined'){var d=document.createElement('div');d.setAttribute('role','alert');" +
  "d.style.cssText='position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483647;overflow:auto;background:#fff;color:#1f2937;padding:72px 24px 24px;font:16px/1.7 sans-serif';" +
  "d.innerHTML=n" +
  "?'<h1 style=\"font-size:22px;margin:0 0 12px\">需要更新系統元件</h1>" +
  "<p style=\"margin:0 0 16px\">這支手機的「Android System WebView」版本太舊，好耶的畫面無法顯示。</p>" +
  "<p style=\"margin:0 0 16px\">請到 Play 商店更新「Android System WebView」和「Chrome」，更新完再重新開啟好耶。</p>" +
  "<a href=\"https://play.google.com/store/apps/details?id=com.google.android.webview\" style=\"display:block;padding:14px 16px;border-radius:12px;text-align:center;font-weight:bold;text-decoration:none;background:#6C5CE7;color:#fff\">到 Play 商店更新</a>'" +
  ":'<h1 style=\"font-size:22px;margin:0 0 12px\">需要更新瀏覽器</h1>" +
  "<p style=\"margin:0 0 16px\">這個瀏覽器的版本太舊，好耶的畫面無法顯示。請更新瀏覽器，或改用新版的 Chrome、Safari、Firefox、Edge 開啟。</p>';" +
  "(document.body||document.documentElement).appendChild(d);}" +
  "}catch(e){}})();";

export default function PlatformScript() {
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
