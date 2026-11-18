// 本機 Ollama 的最小用戶端，給 scripts/marketing/post-variants.mjs 與 scripts/local/watch-official-pages.mjs 共用。
// 只用 Node 內建的 fetch，維護者的 Windows 電腦不用 npm install。
//
// 為什麼錯誤訊息要寫「下一步」：這些腳本是維護者自己在終端機跑的，
// 看到 "fetch failed" 不知道是 Ollama 沒開、埠號不對還是沒下載模型。
export const DEFAULT_HOST = "http://127.0.0.1:11434";

/** 環境變數 OLLAMA_HOST 可能沒寫 http://（Ollama 官方文件的寫法是 127.0.0.1:11434），補上再用 */
export function resolveHost(host) {
  const raw = String(host || process.env.OLLAMA_HOST || DEFAULT_HOST).trim();
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  return withScheme.replace(/\/+$/, "");
}

function unreachable(host, cause) {
  const detail = cause ? `（${cause}）` : "";
  return new Error(`連不到 Ollama（${host}）${detail}。先確認 Ollama 有在執行：ollama list`);
}

function causeText(err) {
  return err?.cause?.code || err?.cause?.message || err?.message || String(err);
}

async function call(host, path, { method = "GET", body, timeoutMs }) {
  let res;
  try {
    res = await fetch(`${host}${path}`, {
      method,
      headers: body ? { "content-type": "application/json", "user-agent": "haoye-page-watch/1.0" } : { "user-agent": "haoye-page-watch/1.0" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      throw new Error(
        `Ollama（${host}）${Math.round(timeoutMs / 1000)} 秒內沒有回應。模型第一次載入可能要比較久：先在另一個視窗跑 ollama run <模型名稱> 讓它載入，或改用比較小的模型（OLLAMA_MODEL）。`,
      );
    }
    throw unreachable(host, causeText(err));
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`Ollama 回應 HTTP ${res.status}：${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return res;
}

/** 回傳本機已下載的模型名稱，例如 ["qwen2.5:7b", "llama3.1:8b"] */
export async function listModels({ host, timeoutMs = 10000 } = {}) {
  const base = resolveHost(host);
  const res = await call(base, "/api/tags", { timeoutMs });
  const data = await res.json().catch(() => null);
  if (!data || !Array.isArray(data.models)) throw new Error(`Ollama（${base}）的 /api/tags 回傳格式不對，確認連到的是 Ollama：ollama list`);
  return data.models.map((m) => m.name || m.model).filter(Boolean);
}

/** OLLAMA_MODEL > 參數 > listModels 的第一個。沒有任何模型時說明怎麼下載 */
export async function pickModel({ host, model } = {}) {
  const chosen = model || process.env.OLLAMA_MODEL;
  if (chosen) return chosen;
  const base = resolveHost(host);
  const models = await listModels({ host: base });
  if (models.length === 0) {
    throw new Error(`Ollama（${base}）裡沒有任何模型。先下載一個，例如：ollama pull qwen2.5:7b ；下載完用 ollama list 確認，再設 OLLAMA_MODEL。`);
  }
  return models[0];
}

/**
 * 回傳模型的回覆文字。temperature 預設 0.3：改寫貼文與判讀變動都不需要發揮，
 * 越低越不容易自己加內容。
 */
export async function generate({ host, model, prompt, temperature = 0.3, timeoutMs = 120000 } = {}) {
  const base = resolveHost(host);
  const name = await pickModel({ host: base, model });
  let res;
  try {
    res = await call(base, "/api/generate", {
      method: "POST",
      body: { model: name, prompt, stream: false, options: { temperature } },
      timeoutMs,
    });
  } catch (err) {
    if (err.status === 404) {
      throw new Error(`Ollama（${base}）找不到模型 ${name}。用 ollama list 看有哪些，或下載：ollama pull ${name}`);
    }
    throw err;
  }
  const data = await res.json().catch(() => null);
  if (!data || typeof data.response !== "string") throw new Error(`Ollama（${base}）回傳格式不對：沒有 response 欄位`);
  return data.response;
}
