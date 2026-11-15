"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { INSURANCE_YEAR_LABEL, MAX_COUNTED_DEPENDENTS, calculateInsurance } from "@/lib/calculators/insurance";
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
              配偶或未成年子女等隨本人加保的眷屬；超過 {MAX_COUNTED_DEPENDENTS} 人，健保費以 {MAX_COUNTED_DEPENDENTS} 人計
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
                  value={`月薪：${salary.toLocaleString("zh-TW")} 元\n勞保＋就保：${result.laborInsurance.toLocaleString("zh-TW")} 元（投保薪資 ${result.laborGrade.toLocaleString("zh-TW")}）\n健保費：${result.healthInsurance.toLocaleString("zh-TW")} 元（投保金額 ${result.healthGrade.toLocaleString("zh-TW")}）\n合計扣除：${result.totalDeduction.toLocaleString("zh-TW")} 元\n實領薪資：${result.netSalary.toLocaleString("zh-TW")} 元`}
                  label="複製結果"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "勞保＋就保（自付）", value: `NT$${result.laborInsurance.toLocaleString("zh-TW")}` },
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

            <div className="space-y-1 rounded-lg border border-border p-3 text-xs leading-relaxed text-muted-foreground">
              <p>
                勞保月投保薪資 {result.laborGrade.toLocaleString("zh-TW")} 元
                {salary > result.laborGrade ? "（最高一級，月薪更高也用這一級算）" : ""}
                ；健保投保金額 {result.healthGrade.toLocaleString("zh-TW")} 元
                {deps > result.countedDependents ? `，眷屬以 ${result.countedDependents} 人計` : ""}。
              </p>
              <p>
                依 {INSURANCE_YEAR_LABEL}的費率與投保級距計算：勞保普通事故 11.5% 加就業保險 1%，自付 20%；健保 5.17%，自付 30%。
                雇主、外籍移工等不參加就業保險的人，勞保費會少一些。
              </p>
              <p>實際扣款以公司申報的投保薪資為準，獎金、津貼有沒有計入會影響級距。</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
