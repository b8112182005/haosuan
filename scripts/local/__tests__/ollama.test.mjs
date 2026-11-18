import { afterEach, beforeAll, afterAll, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { pickModel, resolveHost } from "../ollama.mjs";

describe("resolveHost", () => {
  const cases = [
    ["127.0.0.1", "http://127.0.0.1:11434"],
    ["0.0.0.0", "http://127.0.0.1:11434"],
    [":11434", "http://127.0.0.1:11434"],
    ["0.0.0.0:11434", "http://127.0.0.1:11434"],
    ["http://localhost:11434", "http://localhost:11434"],
    ["localhost", "http://localhost:11434"],
    ["http://192.168.1.5:8080", "http://192.168.1.5:8080"],
    ["::", "http://127.0.0.1:11434"],
    ["[::]:9999", "http://127.0.0.1:9999"],
    ["http://localhost:11434/", "http://localhost:11434"],
    ["0.0.0.0:8080", "http://127.0.0.1:8080"],
    ["https://ollama.example.test", "https://ollama.example.test"],
  ];
  for (const [input, expected] of cases) {
    it(`${JSON.stringify(input)} → ${expected}`, () => {
      expect(resolveHost(input)).toBe(expected);
    });
  }

  it("沒傳參數時讀 OLLAMA_HOST，也套用同樣的補法", () => {
    const old = process.env.OLLAMA_HOST;
    try {
      process.env.OLLAMA_HOST = "0.0.0.0";
      expect(resolveHost()).toBe("http://127.0.0.1:11434");
      delete process.env.OLLAMA_HOST;
      expect(resolveHost()).toBe("http://127.0.0.1:11434");
    } finally {
      if (old === undefined) delete process.env.OLLAMA_HOST;
      else process.env.OLLAMA_HOST = old;
    }
  });
});

describe("pickModel", () => {
  let server;
  let host;
  let models = [];
  const oldModel = process.env.OLLAMA_MODEL;

  beforeAll(async () => {
    server = createServer((req, res) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ models: models.map((name) => ({ name })) }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    host = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(() => new Promise((resolve) => server.close(resolve)));
  afterEach(() => {
    if (oldModel === undefined) delete process.env.OLLAMA_MODEL;
    else process.env.OLLAMA_MODEL = oldModel;
  });

  it("沒設 OLLAMA_MODEL 時略過名稱含 embed 的模型", async () => {
    delete process.env.OLLAMA_MODEL;
    models = ["nomic-embed-text:latest", "qwen2.5:7b", "llama3.1:8b"];
    expect(await pickModel({ host })).toBe("qwen2.5:7b");
  });

  it("embed 大小寫都略過", async () => {
    delete process.env.OLLAMA_MODEL;
    models = ["mxbai-Embed-large", "llama3.1:8b"];
    expect(await pickModel({ host })).toBe("llama3.1:8b");
  });

  it("全部都是嵌入模型：丟出說明要設 OLLAMA_MODEL 的錯誤", async () => {
    delete process.env.OLLAMA_MODEL;
    models = ["nomic-embed-text:latest", "bge-m3-embed"];
    await expect(pickModel({ host })).rejects.toThrow(/OLLAMA_MODEL/);
    await expect(pickModel({ host })).rejects.toThrow(/嵌入模型/);
  });

  it("有設 OLLAMA_MODEL 就照用，連嵌入模型的名字也不攔", async () => {
    process.env.OLLAMA_MODEL = "my-embed-tuned";
    models = ["qwen2.5:7b"];
    expect(await pickModel({ host })).toBe("my-embed-tuned");
  });

  it("沒有任何模型時說明怎麼下載", async () => {
    delete process.env.OLLAMA_MODEL;
    models = [];
    await expect(pickModel({ host })).rejects.toThrow(/ollama pull/);
  });
});
