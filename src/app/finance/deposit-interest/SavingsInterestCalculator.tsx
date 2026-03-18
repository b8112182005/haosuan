"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { calculateSavingsInterest, type InterestType } from "@/lib/calculators/savings-interest";
import CopyButton from "@/components/common/CopyButton";

export default function SavingsInterestCalculator() {
  const [principal, setPrincipal] = useState("100000");
  const [annualRate, setAnnualRate] = useState("1.5");
  const [months, setMonths] = useState("12");
  const [type, setType] = useState<InterestType>("compound");

  const p = parseFloat(principal);
  const r = parseFloat(annualRate);
  const m = parseFloat(months);

  const isValid =
    !isNaN(p) && p > 0 &&
    !isNaN(r) && r >= 0 &&
    !isNaN(m) && m > 0;

  const result = isValid ? calculateSavingsInterest(p, r, m, type) : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="principal">本金（元）</Label>
            <Input
              id="principal"
              type="number"
              inputMode="decimal"
              placeholder="例如：100000"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="annualRate">年利率（%）</Label>
            <Input
              id="annualRate"
              type="number"
              inputMode="decimal"
              placeholder="例如：1.5"
              value={annualRate}
              onChange={(e) => setAnnualRate(e.target.value)}
              step={0.1}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="months">存款期間（月）</Label>
            <Input
              id="months"
              type="number"
              inputMode="numeric"
              placeholder="例如：12"
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              min={1}
            />
          </div>
          <div className="space-y-2">
            <Label>計息方式</Label>
            <div className="flex gap-2">
              {(["simple", "compound"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    type === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t === "simple" ? "單利" : "複利"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {result && result.totalAmount > 0 && (
          <>
            <div className="rounded-xl bg-muted/50 p-6 text-center space-y-2">
              <div className="text-sm text-muted-foreground">到期本利和</div>
              <div className="text-5xl font-mono font-bold tracking-tight text-primary">
                NT${result.totalAmount.toLocaleString("zh-TW", { maximumFractionDigits: 0 })}
              </div>
              <div className="text-sm text-muted-foreground">
                利息收入 NT${result.interest.toLocaleString("zh-TW", { maximumFractionDigits: 0 })}
              </div>
              <div className="flex justify-center pt-1">
                <CopyButton
                  value={`本金：${p.toLocaleString("zh-TW")} 元\n年利率：${r}%（${type === "simple" ? "單利" : "複利"}）\n期間：${m} 個月\n利息：${result.interest.toLocaleString("zh-TW")} 元\n到期本利和：${result.totalAmount.toLocaleString("zh-TW")} 元\n實際年利率：${result.effectiveRate}%`}
                  label="複製結果"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "利息金額", value: `NT$${result.interest.toLocaleString("zh-TW", { maximumFractionDigits: 0 })}`, color: "text-green-400" },
                { label: "到期本利和", value: `NT$${result.totalAmount.toLocaleString("zh-TW", { maximumFractionDigits: 0 })}`, color: "text-primary" },
                { label: "實際年利率", value: `${result.effectiveRate}%`, color: "" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                  <div className={`font-mono font-semibold text-xs sm:text-sm ${item.color}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
