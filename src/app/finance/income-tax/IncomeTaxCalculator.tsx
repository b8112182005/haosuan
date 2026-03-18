"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { calculateIncomeTax } from "@/lib/calculators/income-tax";

function formatTWD(n: number) {
  return `NT$${n.toLocaleString("zh-TW")}`;
}

export default function IncomeTaxCalculator() {
  const [monthlySalary, setMonthlySalary] = useState("50000");
  const [hasSpouse, setHasSpouse] = useState(false);
  const [numDependents, setNumDependents] = useState("0");
  const [numElderlyDependents, setNumElderlyDependents] = useState("0");

  const monthly = parseFloat(monthlySalary);
  const annual = isNaN(monthly) ? 0 : monthly * 12;
  const deps = parseInt(numDependents) || 0;
  const elderlyDeps = parseInt(numElderlyDependents) || 0;

  const isValid = !isNaN(monthly) && monthly >= 0;
  const result = isValid
    ? calculateIncomeTax({
        annualSalary: annual,
        numDependents: deps,
        hasSpouse,
        numElderlyDependents: Math.min(elderlyDeps, deps),
      })
    : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* 輸入區 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="monthly-salary">月薪（元）</Label>
            <Input
              id="monthly-salary"
              type="number"
              inputMode="decimal"
              placeholder="例如：50000"
              value={monthlySalary}
              onChange={(e) => setMonthlySalary(e.target.value)}
              min={0}
            />
            {!isNaN(monthly) && monthly > 0 && (
              <p className="text-xs text-muted-foreground">
                年薪：{formatTWD(annual)}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>婚姻狀況</Label>
            <div className="flex rounded-lg border border-border overflow-hidden h-10">
              <button
                className={`flex-1 text-sm transition-colors ${
                  !hasSpouse ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
                }`}
                onClick={() => setHasSpouse(false)}
              >
                單身
              </button>
              <button
                className={`flex-1 text-sm transition-colors ${
                  hasSpouse ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
                }`}
                onClick={() => setHasSpouse(true)}
              >
                已婚
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dependents">受撫養親屬人數</Label>
            <Input
              id="dependents"
              type="number"
              inputMode="numeric"
              placeholder="例如：2"
              value={numDependents}
              onChange={(e) => setNumDependents(e.target.value)}
              min={0}
              max={10}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="elderly-dependents">其中 70 歲以上直系尊親屬</Label>
            <Input
              id="elderly-dependents"
              type="number"
              inputMode="numeric"
              placeholder="例如：1"
              value={numElderlyDependents}
              onChange={(e) => setNumElderlyDependents(e.target.value)}
              min={0}
              max={10}
            />
          </div>
        </div>

        {result && (
          <>
            {/* 主要結果 */}
            <div className="rounded-xl bg-muted/50 p-6 text-center space-y-2">
              <div className="text-sm text-muted-foreground">年度應納稅額</div>
              <div className="text-5xl font-mono font-bold tracking-tight">
                {formatTWD(result.taxAmount)}
              </div>
              <div className="text-sm text-muted-foreground">
                月均稅額：{formatTWD(result.monthlyTax)}・有效稅率：{result.effectiveRate}%
              </div>
            </div>

            {/* 扣除明細 */}
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">扣除明細</h3>
              {[
                { label: "年薪", value: result.annualSalary, isIncome: true },
                { label: "薪資所得特別扣除額", value: -result.salaryDeduction },
                { label: "個人免稅額", value: -result.personalExemption },
                ...(result.spouseExemption > 0
                  ? [{ label: "配偶免稅額", value: -result.spouseExemption }]
                  : []),
                ...(result.dependentExemption > 0
                  ? [{ label: "受撫養親屬免稅額", value: -result.dependentExemption }]
                  : []),
                { label: "標準扣除額", value: -result.standardDeduction },
                { label: "綜合所得淨額", value: result.netIncome, isTotal: true },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex justify-between text-sm py-1.5 border-b border-border/50 ${
                    item.isTotal ? "font-semibold" : ""
                  }`}
                >
                  <span className={item.isIncome ? "" : "text-muted-foreground pl-4"}>
                    {item.label}
                  </span>
                  <span className={`font-mono ${item.value < 0 ? "text-red-400" : ""}`}>
                    {item.value < 0 ? "-" : ""}
                    {formatTWD(Math.abs(item.value))}
                  </span>
                </div>
              ))}
            </div>

            {/* 稅率級距 */}
            {result.breakdown.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">稅額計算</h3>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border">
                        <th className="px-3 py-2 text-left">所得區間</th>
                        <th className="px-3 py-2 text-right">稅率</th>
                        <th className="px-3 py-2 text-right">稅額</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {result.breakdown.map((row) => (
                        <tr key={row.bracket}>
                          <td className="px-3 py-2">{row.bracket}</td>
                          <td className="px-3 py-2 text-right">{row.rate}%</td>
                          <td className="px-3 py-2 text-right font-mono">
                            {formatTWD(row.tax)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
