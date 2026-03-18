"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  calculateCompoundInterest,
  type CompoundFrequency,
} from "@/lib/calculators/compound-interest";
import CopyButton from "@/components/common/CopyButton";

function formatTWD(n: number) {
  return `NT$${n.toLocaleString("zh-TW")}`;
}

export default function CompoundInterestCalculator() {
  const [principal, setPrincipal] = useState("100000");
  const [rate, setRate] = useState("7");
  const [years, setYears] = useState("20");
  const [monthly, setMonthly] = useState("5000");
  const [freq, setFreq] = useState<CompoundFrequency>("monthly");

  const p = parseFloat(principal);
  const r = parseFloat(rate);
  const y = parseInt(years);
  const m = parseFloat(monthly) || 0;

  const isValid =
    !isNaN(p) && p >= 0 &&
    !isNaN(r) && r >= 0 && r <= 100 &&
    !isNaN(y) && y >= 1 && y <= 50;

  const result = isValid
    ? calculateCompoundInterest({
        principal: p,
        annualRate: r,
        years: y,
        monthlyContribution: m,
        compoundFrequency: freq,
      })
    : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* 輸入區 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="principal">初始本金（元）</Label>
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
            <Label htmlFor="rate">年化報酬率（%）</Label>
            <Input
              id="rate"
              type="number"
              inputMode="decimal"
              placeholder="例如：7"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              step={0.1}
              min={0}
              max={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="years">投資年限（年）</Label>
            <Input
              id="years"
              type="number"
              inputMode="numeric"
              placeholder="例如：20"
              value={years}
              onChange={(e) => setYears(e.target.value)}
              min={1}
              max={50}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthly">每月定期投入（元）</Label>
            <Input
              id="monthly"
              type="number"
              inputMode="decimal"
              placeholder="例如：5000（無則填 0）"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              min={0}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>複利計算頻率</Label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(
                [
                  { value: "monthly", label: "月複利" },
                  { value: "quarterly", label: "季複利" },
                  { value: "annually", label: "年複利" },
                ] as { value: CompoundFrequency; label: string }[]
              ).map(({ value, label }) => (
                <button
                  key={value}
                  className={`flex-1 py-2 text-sm transition-colors ${
                    freq === value
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setFreq(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {result && (
          <>
            {/* 主要結果 */}
            <div className="rounded-xl bg-muted/50 p-6 text-center space-y-2">
              <div className="text-sm text-muted-foreground">最終金額</div>
              <div className="text-5xl font-mono font-bold tracking-tight">
                {formatTWD(result.finalAmount)}
              </div>
              <div className="text-sm text-muted-foreground">
                總報酬率 {result.returnRate}%
              </div>
              <div className="flex items-center justify-center gap-3 pt-1">
                <CopyButton value={result.finalAmount.toFixed(0)} label="複製金額" />
              </div>
              <div className="text-sm text-amber-500 dark:text-amber-400 pt-1">
                💡 等同於 {y} 年後多了 {result.returnRate}% 的錢
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                比直接放活存（0.5% 年利率）多賺 {formatTWD(Math.round(result.finalAmount - (p * Math.pow(1 + 0.005 / 12, y * 12) + m * ((Math.pow(1 + 0.005 / 12, y * 12) - 1) / (0.005 / 12)))))}
              </p>
            </div>

            {/* 三欄摘要 */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "本金合計", value: formatTWD(result.totalContributions) },
                { label: "利息收益", value: formatTWD(result.totalInterest) },
                { label: "最終金額", value: formatTWD(result.finalAmount) },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-border p-3 text-center"
                >
                  <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                  <div className="font-mono font-semibold text-xs sm:text-sm">{item.value}</div>
                </div>
              ))}
            </div>

            {/* 年度數據表 */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">年度成長明細</h3>
              <div className="rounded-lg border border-border overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0">
                    <tr className="bg-muted border-b border-border">
                      <th className="px-3 py-2 text-left">年</th>
                      <th className="px-3 py-2 text-right">本金累計</th>
                      <th className="px-3 py-2 text-right">利息累計</th>
                      <th className="px-3 py-2 text-right">總資產</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {result.yearlyData.map((row) => (
                      <tr key={row.year}>
                        <td className="px-3 py-1.5">{row.year}</td>
                        <td className="px-3 py-1.5 text-right font-mono">
                          {row.contributions.toLocaleString("zh-TW")}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-green-400">
                          {row.interest.toLocaleString("zh-TW")}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-medium">
                          {row.balance.toLocaleString("zh-TW")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
