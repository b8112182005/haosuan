// 在任何 React 程式跑之前就把平台寫到 <html data-platform>，
// 讓 globals.css 的 .web-only / .app-only 規則在首次繪製時就生效（不會閃一下網頁版的 Footer）。
// Capacitor 的原生橋接 JS 在 document start 就注入 window.Capacitor，所以這段同步腳本讀得到。
const code =
  "(function(){try{var c=window.Capacitor;var p=(c&&typeof c.isNativePlatform==='function'&&c.isNativePlatform())?c.getPlatform():'web';document.documentElement.setAttribute('data-platform',p);}catch(e){}})();";

export default function PlatformScript() {
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
