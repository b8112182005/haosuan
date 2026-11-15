/**
 * 畫面底部的短訊息（「已加入提醒」這一類）。
 *
 * 訊息的狀態不能放在觸發它的元件身上：提醒頁空清單裡的「加入提醒」按鈕，加完第一筆之後整個空狀態區塊會被卸載，
 * 按鈕連同它的訊息一起消失，使用者看不到「通知權限沒開」「這一期只會通知 1 次」這些說明。
 * 所以改成全站只有一個 <Toaster />（掛在 layout），任何地方呼叫 showToast 都由它顯示。
 */
type Listener = (message: string) => void;

const listeners = new Set<Listener>();

export function showToast(message: string): void {
  for (const listener of listeners) listener(message);
}

export function subscribeToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
