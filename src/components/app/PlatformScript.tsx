// 在任何 React 程式跑之前執行的同步腳本，做兩件事：
//
// 1. 把平台寫到 <html data-platform>，讓 globals.css 的 .web-only / .app-only 規則在首次繪製時就生效
//    （不會閃一下網頁版的 Footer）。Capacitor 的原生橋接在 document start 就注入 window.Capacitor，所以讀得到。
//
// 2. Capacitor 的本機伺服器對「沒有副檔名的路徑」一律回根目錄的 index.html（html5mode）。
//    平常用 <Link> 換頁走的是 RSC 的 .txt 檔，不受影響；但 Next 在 RSC 請求失敗時會退回整頁載入，
//    這時 /subsidy/check/ 拿到的會是首頁的 HTML。偵測到這種情況就改載入該路徑自己的 index.html
//    （有副檔名，本機伺服器會回正確的檔案）。網頁版的伺服器會回正確的頁面，不需要這段。
const code =
  "(function(){try{var c=window.Capacitor;var n=!!(c&&typeof c.isNativePlatform==='function'&&c.isNativePlatform());" +
  "document.documentElement.setAttribute('data-platform',n?c.getPlatform():'web');" +
  "if(n){var p=location.pathname;if(p!=='/'&&!/\\.html$/.test(p)){location.replace(p.replace(/\\/?$/,'/')+'index.html'+location.search+location.hash);}}" +
  "}catch(e){}})();";

export default function PlatformScript() {
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
