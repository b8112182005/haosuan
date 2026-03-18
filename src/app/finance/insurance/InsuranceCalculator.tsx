"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { calculateInsurance } from "@/lib/calculators/insurance";
import CopyButton from "@/components/common/CopyButton";

export default function InsuranceCalculator() {
  const [monthlySalary, setMonthlySalary] = useState("45000");
  const [dependents, setDependents] = useState("0");

  const salary = parseFloat(monthlySalary);
  const deps = parseInt(dependents, 10);

  const isValid =
    !isNaN(salary) && salary > 0 &&
    !isNaN(deps) && deps >= 0 && deps <= 5;

  const result = isValid ? calculateInsurance(salary, deps) : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="monthlySalary">月薪（元）</Label>
            <Input
              id="monthlySalary"
              type="number"
              inputMode="decimal"
              placeholder="例如：45000"
              value={monthlySalary}
              onChange={(e) => setMonthlySalary(e.target.value)}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dependents">眷屬人數</Label>
            <Input
              id="dependents"
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={dependents}
              onChange={(e) => setDependents(e.target.value)}
              min={0}
              max={5}
            />
            <p className="text-xs text-muted-foreground">
              配偶或未成年子女等隨本人加保的眷屬（0-5 人）
            </p>
          </div>
        </div>

        {result && result.netSalary > 0 && (
          <>
            <div className="rounded-xl bg-muted/50 p-6 text-center space-y-2">
              <div className="text-sm text-muted-foreground">每月實領薪資</div>
              <div className="text-5xl font-mono font-bold tracking-tight text-primary">
                NT${result.netSalary.toLocaleString("zh-TW")}
              </div>
              <div className="text-sm text-muted-foreground">
                合計扣除 NT${result.totalDeduction.toLocaleString("zh-TW")}
              </div>
              <div className="flex justify-center pt-1">
                <CopyButton
                  value={`月薪：${salary.toLocaleString("zh-TW")} 元\n勞保費：${result.laborInsurance.toLocaleString("zh-TW")} 元\n健保費：${result.healthInsurance.toLocaleString("zh-TW")} 元\n合計扣除：${result.totalDeduction.toLocaleString("zh-TW")} 元\n實領薪資：${result.netSalary.toLocaleString("zh-TW")} 元`}
                  label="複製結果"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "勞保費（自付）", value: `NT$${result.laborInsurance.toLocaleString("zh-TW")}` },
                { label: "健保費（自付）", value: `NT$${result.healthInsurance.toLocaleString("zh-TW")}` },
                { label: "合計扣除", value: `NT$${result.totalDeduction.toLocaleString("zh-TW")}` },
                { label: "實領薪資", value: `NT$${result.netSalary.toLocaleString("zh-TW")}`, color: "text-primary" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                  <div className={`font-mono font-semibold text-xs sm:text-sm ${item.color || ""}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-600 dark:text-amber-400">
              本計算以 2024 年費率直接以月薪計算，實際勞健保依投保薪資分級表對應級距，結果可能略有差異，僅供參考。
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
