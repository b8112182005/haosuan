// 本機 Ollama 的最小用戶端，給 scripts/marketing/post-variants.mjs 與 scripts/local/watch-official-pages.mjs 共用。
// 只用 Node 內建的 fetch，維護者的 Windows 電腦不用 npm install。
//
// 為什麼錯誤訊息要寫「下一步」：這些腳本是維護者自己在終端機跑的，
// 看到 "fetch failed" 不知道是 Ollama 沒開、埠號不對還是沒下載模型。
export const DEFAULT_HOST = "http://127.0.0.1:11434";

export const DEFAULT_PORT = "11434";

/**
 * 環境變數 OLLAMA_HOST 的寫法很多：Ollama 官方文件寫 127.0.0.1:11434（沒有 http://），
 * 要讓別台電腦連進來時會設成 0.0.0.0，也有人只寫 :11434 或 localhost。
 * 補上 http://、沒寫埠號時補 11434；0.0.0.0、::、空的主機是「監聽所有網卡」的寫法，
 * 不能當成連線目標（Windows 連 0.0.0.0 會失敗），換成 127.0.0.1。
 */
export function resolveHost(host) {
  const raw = String(host || process.env.OLLAMA_HOST || DEFAULT_HOST).trim();
  const scheme = /^https?:\/\//i.exec(raw)?.[0].toLowerCase() ?? "http://";
  const rest = raw.slice(/^https?:\/\//i.test(raw) ? raw.indexOf("//") + 2 : 0);
  const slash = rest.indexOf("/");
  const authority = slash >= 0 ? rest.slice(0, slash) : rest;
  const path = slash >= 0 ? rest.slice(slash).replace(/\/+$/, "") : "";

  let hostname;
  let port = "";
  const bracketed = /^(\[[^\]]*\])(?::(\d*))?$/.exec(authority);
  if (bracketed) {
    hostname = bracketed[1];
    port = bracketed[2] ?? "";
  } else if ((authority.match(/:/g) ?? []).length > 1) {
    // 沒加中括號的 IPv6（例如 "::"），整串都是主機，沒有埠號可言
    hostname = `[${authority}]`;
  } else {
    const at = authority.indexOf(":");
    hostname = at >= 0 ? authority.slice(0, at) : authority;
    port = at >= 0 ? authority.slice(at + 1) : "";
  }
  if (hostname === "" || hostname === "0.0.0.0" || hostname === "[::]" || hostname === "[::0]" || hostname === "[0:0:0:0:0:0:0:0]") hostname = "127.0.0.1";
  // https:// 通常是放在反向代理後面，預設埠是 443，不補 11434
  if (port === "" && scheme === "http://") port = DEFAULT_PORT;
  return `${scheme}${hostname}${port ? `:${port}` : ""}${path}`;
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

/** 嵌入模型（nomic-embed-text 等）只能把文字轉成向量，叫它生成文字會回 400 */
export function isEmbeddingModel(name) {
  return /embed/i.test(String(name));
}

/**
 * OLLAMA_MODEL > 參數 > listModels 裡第一個能生成文字的模型。
 * 沒指定時略過名稱含 embed 的：ollama list 的順序不由我們決定，嵌入模型排第一就會整個腳本壞掉。
 */
export async function pickModel({ host, model } = {}) {
  const chosen = model || process.env.OLLAMA_MODEL;
  if (chosen) return chosen;
  const base = resolveHost(host);
  const models = await listModels({ host: base });
  if (models.length === 0) {
    throw new Error(`Ollama（${base}）裡沒有任何模型。先下載一個，例如：ollama pull qwen2.5:7b ；下載完用 ollama list 確認，再設 OLLAMA_MODEL。`);
  }
  const usable = models.find((m) => !isEmbeddingModel(m));
  if (!usable) {
    throw new Error(`Ollama（${base}）裡只有嵌入模型（${models.join("、")}），嵌入模型不能生成文字。先下載一個對話模型，例如：ollama pull qwen2.5:7b ；再設 OLLAMA_MODEL，例如 OLLAMA_MODEL=qwen2.5:7b。`);
  }
  return usable;
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
