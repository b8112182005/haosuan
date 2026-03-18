"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  calculateMortgage,
  type RepaymentType,
} from "@/lib/calculators/mortgage";

function formatTWD(n: number) {
  return `NT$${n.toLocaleString("zh-TW")}`;
}

export default function MortgageCalculator() {
  const [loanAmount, setLoanAmount] = useState("8000000");
  const [rate, setRate] = useState("2.1");
  const [years, setYears] = useState("20");
  const [repaymentType, setRepaymentType] =
    useState<RepaymentType>("equal-payment");

  const loan = parseFloat(loanAmount.replace(/,/g, ""));
  const r = parseFloat(rate);
  const y = parseInt(years);

  const isValid =
    !isNaN(loan) && loan > 0 &&
    !isNaN(r) && r >= 0 && r <= 30 &&
    !isNaN(y) && y >= 1 && y <= 40;

  const result = isValid ? calculateMortgage(loan, r, y, repaymentType) : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* 輸入區 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="loan-amount">貸款金額（元）</Label>
            <Input
              id="loan-amount"
              type="number"
              inputMode="decimal"
              placeholder="例如：8000000"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              min={1}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate">年利率（%）</Label>
            <Input
              id="rate"
              type="number"
              inputMode="decimal"
              placeholder="例如：2.1"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              step={0.01}
              min={0}
              max={30}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="years">貸款年限（年）</Label>
            <Input
              id="years"
              type="number"
              inputMode="decimal"
              placeholder="例如：20"
              value={years}
              onChange={(e) => setYears(e.target.value)}
              min={1}
              max={40}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repayment-type">還款方式</Label>
            <select
              id="repayment-type"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={repaymentType}
              onChange={(e) =>
                setRepaymentType(e.target.value as RepaymentType)
              }
            >
              <option value="equal-payment">本息均攤（等額本息）</option>
              <option value="equal-principal">本金均攤（等額本金）</option>
            </select>
          </div>
        </div>

        {result && (
          <>
            {/* 摘要結果 */}
            <div className="rounded-xl bg-muted/50 p-6 space-y-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">
                  {repaymentType === "equal-payment"
                    ? "每月還款金額"
                    : "第一個月還款金額"}
                </div>
                <div className="text-5xl font-mono font-bold tracking-tight">
                  {formatTWD(result.firstMonthPayment)}
                </div>
                {repaymentType === "equal-principal" && (
                  <div className="text-sm text-muted-foreground mt-1">
                    最後一個月：{formatTWD(result.lastMonthPayment)}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 pt-2">
                {[
                  { label: "貸款總額", value: formatTWD(result.loanAmount) },
                  { label: "總利息", value: formatTWD(result.totalInterest) },
                  { label: "還款總額", value: formatTWD(result.totalPayment) },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-border p-3 text-center"
                  >
                    <div className="text-xs text-muted-foreground mb-1">
                      {item.label}
                    </div>
                    <div className="font-mono font-semibold text-sm">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 前 12 個月明細 */}
            <div>
              <h3 className="text-sm font-medium mb-3 text-muted-foreground">
                前 12 個月還款明細
              </h3>
              <div className="rounded-lg border border-border overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-2 text-left">月份</th>
                      <th className="px-3 py-2 text-right">本金</th>
                      <th className="px-3 py-2 text-right">利息</th>
                      <th className="px-3 py-2 text-right">月付</th>
                      <th className="px-3 py-2 text-right">餘額</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {result.schedule.slice(0, 12).map((row) => (
                      <tr key={row.month}>
                        <td className="px-3 py-2">{row.month}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {row.principal.toLocaleString("zh-TW")}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                          {row.interest.toLocaleString("zh-TW")}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-medium">
                          {row.payment.toLocaleString("zh-TW")}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">
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
