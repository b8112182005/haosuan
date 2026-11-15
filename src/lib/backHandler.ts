/**
 * Android 返回鍵的攔截堆疊。
 *
 * 開著的面板、試算精靈的「上一題」這類畫面內的狀態，使用者按返回鍵時預期先退這一層，
 * 而不是整頁跳走（面板還開著就被帶回上一頁，填到一半的內容會不見）。
 * 元件在狀態成立時註冊處理函式；NativeBridge 收到返回鍵先問這裡，沒人處理才回上一頁或離開 app。
 *
 * 網頁版不會呼叫 runBackHandlers（瀏覽器的返回鍵攔不到），註冊了也沒有副作用。
 */
export type BackHandler = () => boolean;

const handlers: BackHandler[] = [];

/** 註冊處理函式，回傳取消註冊的函式。後註冊的先被問：最上層的面板先關。 */
export function pushBackHandler(handler: BackHandler): () => void {
  handlers.push(handler);
  return () => {
    const index = handlers.lastIndexOf(handler);
    if (index >= 0) handlers.splice(index, 1);
  };
}

/** 由上往下問，第一個回 true 的處理掉這次返回鍵；全部都沒處理回 false。 */
export function runBackHandlers(): boolean {
  for (let i = handlers.length - 1; i >= 0; i -= 1) {
    try {
      if (handlers[i]()) return true;
    } catch {
      // 單一元件的處理函式出錯不該讓返回鍵失效，繼續問下一個
    }
  }
  return false;
}

/** 測試用：目前註冊了幾個 */
export function backHandlerCount(): number {
  return handlers.length;
}
