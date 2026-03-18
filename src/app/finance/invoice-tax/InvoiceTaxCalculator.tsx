"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { calcFromInclusive, calcFromExclusive } from "@/lib/calculators/invoice-tax";

type Mode = "from-inclusive" | "from-exclusive";

export default function InvoiceTaxCalculator() {
  const [mode, setMode] = useState<Mode>("from-inclusive");
  const [amount, setAmount] = useState("");

  const a = parseFloat(amount);
  const isValid = !isNaN(a) && a >= 0;
  const result = isValid
    ? mode === "from-inclusive"
      ? calcFromInclusive(a)
      : calcFromExclusive(a)
    : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* 模式切換 */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === "from-inclusive"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted/50"
            }`}
            onClick={() => setMode("from-inclusive")}
          >
            含稅拆算未稅
          </button>
          <button
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === "from-exclusive"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted/50"
            }`}
            onClick={() => setMode("from-exclusive")}
          >
            未稅加算含稅
          </button>
        </div>

        {/* 金額輸入 */}
        <div className="space-y-2">
          <Label htmlFor="amount">
            {mode === "from-inclusive" ? "含稅金額（元）" : "未稅金額（元）"}
          </Label>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            placeholder="例如：1050"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0}
          />
        </div>

        {/* 結果 */}
        {result && (
          <div className="space-y-3">
            {[
              {
                label: "未稅金額",
                value: result.taxExclusive,
                highlight: mode === "from-inclusive",
              },
              { label: "營業稅額 (5%)", value: result.taxAmount, highlight: false },
              {
                label: "含稅金額",
                value: result.taxInclusive,
                highlight: mode === "from-exclusive",
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex items-center justify-between rounded-xl p-4 ${
                  item.highlight
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-muted/50"
                }`}
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span
                  className={`text-2xl font-mono font-bold ${
                    item.highlight ? "text-primary" : ""
                  }`}
                >
                  NT${item.value.toLocaleString("zh-TW")}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 快速換算表 */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-2 bg-muted/30 text-xs font-medium text-muted-foreground">
            常見金額換算對照（5% 營業稅）
          </div>
          <div className="divide-y divide-border/50">
            {[100, 500, 1000, 5000, 10000, 50000].map((n) => {
              const r = calcFromExclusive(n);
              return (
                <div
                  key={n}
                  className="flex items-center justify-between px-4 py-2 text-sm"
                >
                  <span className="text-muted-foreground">
                    未稅 NT${n.toLocaleString()}
                  </span>
                  <span className="font-mono">
                    → NT${r.taxInclusive.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
