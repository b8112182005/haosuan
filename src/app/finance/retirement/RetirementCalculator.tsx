"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { calculateRetirement } from "@/lib/calculators/retirement";
import CopyButton from "@/components/common/CopyButton";

function formatTWD(n: number) {
  if (n >= 100000000) {
    return `NT$${(n / 100000000).toFixed(2)} 億`;
  }
  if (n >= 10000) {
    return `NT$${(n / 10000).toFixed(1)} 萬`;
  }
  return `NT$${n.toLocaleString("zh-TW")}`;
}

export default function RetirementCalculator() {
  const [currentAge, setCurrentAge] = useState("30");
  const [retireAge, setRetireAge] = useState("65");
  const [currentSavings, setCurrentSavings] = useState("500000");
  const [monthlySavings, setMonthlySavings] = useState("10000");
  const [annualReturn, setAnnualReturn] = useState("5");

  const ca = parseFloat(currentAge);
  const ra = parseFloat(retireAge);
  const cs = parseFloat(currentSavings);
  const ms = parseFloat(monthlySavings);
  const ar = parseFloat(annualReturn);

  const isValid =
    !isNaN(ca) && ca >= 18 && ca < 100 &&
    !isNaN(ra) && ra > ca && ra <= 100 &&
    !isNaN(cs) && cs >= 0 &&
    !isNaN(ms) && ms >= 0 &&
    !isNaN(ar) && ar >= 0 && ar <= 50;

  const result = isValid ? calculateRetirement(ca, ra, cs, ms, ar) : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="currentAge">目前年齡（歲）</Label>
            <Input
              id="currentAge"
              type="number"
              inputMode="decimal"
              placeholder="例如：30"
              value={currentAge}
              onChange={(e) => setCurrentAge(e.target.value)}
              min={18}
              max={99}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="retireAge">退休年齡（歲）</Label>
            <Input
              id="retireAge"
              type="number"
              inputMode="decimal"
              placeholder="例如：65"
              value={retireAge}
              onChange={(e) => setRetireAge(e.target.value)}
              min={20}
              max={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentSavings">目前存款（元）</Label>
            <Input
              id="currentSavings"
              type="number"
              inputMode="decimal"
              placeholder="例如：500000"
              value={currentSavings}
              onChange={(e) => setCurrentSavings(e.target.value)}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthlySavings">每月儲蓄（元）</Label>
            <Input
              id="monthlySavings"
              type="number"
              inputMode="decimal"
              placeholder="例如：10000"
              value={monthlySavings}
              onChange={(e) => setMonthlySavings(e.target.value)}
              min={0}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="annualReturn">預期年化報酬率（%）</Label>
            <Input
              id="annualReturn"
              type="number"
              inputMode="decimal"
              placeholder="例如：5"
              value={annualReturn}
              onChange={(e) => setAnnualReturn(e.target.value)}
              step={0.1}
              min={0}
              max={50}
            />
            <p className="text-xs text-muted-foreground">
              保守：2-3%（定存）/ 穩健：5-7%（指數基金）/ 積極：8-10%
            </p>
          </div>
        </div>

        {result && result.totalAsset > 0 && (
          <>
            <div className="rounded-xl bg-muted/50 p-6 text-center space-y-2">
              <div className="text-sm text-muted-foreground">
                退休時（{ra} 歲）總資產
              </div>
              <div className="text-5xl font-mono font-bold tracking-tight text-primary">
                {formatTWD(result.totalAsset)}
              </div>
              <div className="text-sm text-muted-foreground">
                退休後每月可動用（30 年餘命）
              </div>
              <div className="text-3xl font-mono font-bold tracking-tight">
                {formatTWD(result.monthlyBudget)}
              </div>
              <div className="flex justify-center pt-1">
                <CopyButton
                  value={`退休總資產：${result.totalAsset.toLocaleString("zh-TW")} 元，每月可用：${result.monthlyBudget.toLocaleString("zh-TW")} 元`}
                  label="複製結果"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "投入本金", value: formatTWD(result.totalContribution), color: "" },
                { label: "複利增值", value: formatTWD(result.totalInterest), color: "text-green-400" },
                { label: "退休總資產", value: formatTWD(result.totalAsset), color: "text-primary" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                  <div className={`font-mono font-semibold text-xs sm:text-sm ${item.color}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-600 dark:text-amber-400">
              本試算未考慮通膨影響。台灣長期通膨率約 1-2%，實際購買力可能較低。建議退休目標金額再乘以 1.5-2 倍作為緩衝。
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
