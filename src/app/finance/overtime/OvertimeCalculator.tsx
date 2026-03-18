"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  calculateOvertime,
  overtimeTypeLabels,
  type OvertimeType,
} from "@/lib/calculators/overtime";

function formatTWD(n: number) {
  return `NT$${n.toLocaleString("zh-TW", { maximumFractionDigits: 0 })}`;
}

export default function OvertimeCalculator() {
  const [salary, setSalary] = useState("35000");
  const [type, setType] = useState<OvertimeType>("weekday");
  const [hours, setHours] = useState("2");

  const s = parseFloat(salary);
  const h = parseFloat(hours);

  const isValid =
    !isNaN(s) && s > 0 &&
    !isNaN(h) && h > 0 && h <= 12;

  const result = isValid ? calculateOvertime(s, type, h) : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="salary">月薪（元）</Label>
            <Input
              id="salary"
              type="number"
              inputMode="decimal"
              placeholder="例如：35000"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              min={0}
            />
            {result && (
              <p className="text-xs text-muted-foreground">
                時薪：{formatTWD(result.hourlyWage)}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="hours">加班時數（小時）</Label>
            <Input
              id="hours"
              type="number"
              inputMode="decimal"
              placeholder="例如：2"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              step={0.5}
              min={0.5}
              max={12}
            />
          </div>
        </div>

        {/* 加班類型 */}
        <div className="space-y-2">
          <Label>加班類型</Label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(overtimeTypeLabels) as OvertimeType[]).map((t) => (
              <button
                key={t}
                className={`rounded-lg border py-2.5 text-xs font-medium transition-colors ${
                  type === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted/50"
                }`}
                onClick={() => setType(t)}
              >
                {overtimeTypeLabels[t]}
              </button>
            ))}
          </div>
        </div>

        {result && (
          <>
            {/* 主要結果 */}
            <div className="rounded-xl bg-muted/50 p-6 text-center space-y-2">
              <div className="text-sm text-muted-foreground">加班費</div>
              <div className="text-5xl font-mono font-bold tracking-tight">
                {formatTWD(result.overtimePay)}
              </div>
              <div className="text-sm text-muted-foreground">
                {overtimeTypeLabels[result.overtimeType]} · {result.overtimeHours} 小時
              </div>
            </div>

            {/* 明細 */}
            {result.breakdown.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="px-4 py-2 text-left">計費段</th>
                      <th className="px-4 py-2 text-right">時數</th>
                      <th className="px-4 py-2 text-right">倍率</th>
                      <th className="px-4 py-2 text-right">金額</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {result.breakdown.map((row) => (
                      <tr key={row.period}>
                        <td className="px-4 py-2">{row.period}</td>
                        <td className="px-4 py-2 text-right">{row.hours}</td>
                        <td className="px-4 py-2 text-right">
                          ×{row.rate.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {formatTWD(row.pay)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <p className="text-xs text-muted-foreground">
          * 依勞基法第 24 條計算。不含勞健保、特殊合約等因素，僅供參考。
        </p>
      </CardContent>
    </Card>
  );
}
