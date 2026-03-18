"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { convertCurrency, CURRENCIES } from "@/lib/calculators/exchange-rate";

export default function ExchangeRateCalculator() {
  const [amount, setAmount] = useState("1000");
  const [fromCode, setFromCode] = useState("TWD");
  const [toCode, setToCode] = useState("JPY");

  const a = parseFloat(amount);
  const isValid = !isNaN(a) && a >= 0;
  const result = isValid ? convertCurrency(a, fromCode, toCode) : null;

  const handleSwap = () => {
    setFromCode(toCode);
    setToCode(fromCode);
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* 金額輸入 */}
        <div className="space-y-2">
          <Label htmlFor="amount">金額</Label>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            placeholder="例如：1000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0}
          />
        </div>

        {/* 幣別選擇 */}
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <Label>從</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={fromCode}
              onChange={(e) => setFromCode(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSwap}
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border hover:bg-muted/50 transition-colors text-lg"
            aria-label="交換幣別"
          >
            ⇄
          </button>

          <div className="flex-1 space-y-2">
            <Label>到</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={toCode}
              onChange={(e) => setToCode(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 結果 */}
        {result && (
          <div className="rounded-xl bg-muted/50 p-6 text-center space-y-3">
            <div className="text-muted-foreground text-sm">
              {result.fromAmount.toLocaleString()} {result.fromCurrency.flag}{" "}
              {result.fromCurrency.code} ＝
            </div>
            <div className="text-5xl font-mono font-bold tracking-tight">
              {result.toAmount.toLocaleString("zh-TW", {
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="text-xl text-muted-foreground">
              {result.toCurrency.flag} {result.toCurrency.code}{" "}
              {result.toCurrency.name}
            </div>
            <div className="text-xs text-muted-foreground pt-2">
              匯率：1 {result.fromCurrency.code} = {result.rate}{" "}
              {result.toCurrency.code}
            </div>
          </div>
        )}

        {/* 常用換算對照 */}
        {result && fromCode === "TWD" && (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-2 bg-muted/30 text-xs text-muted-foreground font-medium">
              台幣換算對照表（參考匯率）
            </div>
            <div className="divide-y divide-border/50">
              {CURRENCIES.filter((c) => c.code !== "TWD").slice(0, 6).map((c) => {
                const r = convertCurrency(a, "TWD", c.code);
                return (
                  <div
                    key={c.code}
                    className="flex items-center justify-between px-4 py-2 text-sm"
                  >
                    <span>
                      {c.flag} {c.code}
                    </span>
                    <span className="font-mono">
                      {r?.toAmount.toLocaleString("zh-TW", {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          ⚠ 以上為參考匯率，非即時報價。實際匯率請查詢台灣銀行或您的銀行。
        </p>
      </CardContent>
    </Card>
  );
}
