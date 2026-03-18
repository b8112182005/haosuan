"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { calculateBmi } from "@/lib/calculators/bmi";
import CopyButton from "@/components/common/CopyButton";

export default function BmiCalculator() {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  const h = parseFloat(height);
  const w = parseFloat(weight);
  const isValid =
    !isNaN(h) && !isNaN(w) && h > 50 && h < 300 && w > 1 && w < 500;
  const result = isValid ? calculateBmi(w, h) : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* 輸入區 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="height">身高（公分）</Label>
            <Input
              id="height"
              type="number"
              inputMode="decimal"
              placeholder="例如：170"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              min={50}
              max={300}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight">體重（公斤）</Label>
            <Input
              id="weight"
              type="number"
              inputMode="decimal"
              placeholder="例如：65"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              min={1}
              max={500}
            />
          </div>
        </div>

        {/* 結果區 */}
        {result && (
          <div className="rounded-xl bg-muted/50 p-6 text-center space-y-3">
            <div className="text-sm text-muted-foreground">您的 BMI 值</div>
            <div className="text-6xl font-mono font-bold tracking-tight">
              {result.bmi}
            </div>
            <div className={`text-xl font-semibold ${result.labelColor}`}>
              {result.label}
            </div>
            <div className="pt-1">
              <CopyButton value={String(result.bmi)} label="複製 BMI 值" />
            </div>
            <div className="text-sm text-muted-foreground pt-2">
              理想體重範圍：{result.idealWeightMin} ～ {result.idealWeightMax} 公斤
              （目前 {w} 公斤，差距 {Math.abs(w - (w < result.idealWeightMin ? result.idealWeightMin : result.idealWeightMax)).toFixed(1)} 公斤）
            </div>
            {result.category === "normal" && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                ✅ 維持現有生活習慣就很棒！
              </p>
            )}
            {result.category === "underweight" && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                💪 均衡飲食、適度增加熱量攝取，可協助達到理想體重
              </p>
            )}
            {(result.category === "overweight" || result.category === "obese_1" || result.category === "obese_2" || result.category === "obese_3") && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                💪 每天多走 30 分鐘可協助改善，加油！
              </p>
            )}
          </div>
        )}

        {/* 標準對照表 */}
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2 text-left font-medium">BMI 範圍</th>
                <th className="px-4 py-2 text-left font-medium">體重狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { range: "< 18.5", label: "體重過輕", color: "text-blue-400" },
                {
                  range: "18.5 – 24",
                  label: "正常體重",
                  color: "text-green-400",
                },
                {
                  range: "24 – 27",
                  label: "體重過重",
                  color: "text-yellow-400",
                },
                {
                  range: "27 – 30",
                  label: "輕度肥胖",
                  color: "text-orange-400",
                },
                { range: "30 – 35", label: "中度肥胖", color: "text-red-400" },
                { range: "≥ 35", label: "重度肥胖", color: "text-red-600" },
              ].map((row) => (
                <tr
                  key={row.range}
                  className={result?.label === row.label ? "bg-muted/40" : ""}
                >
                  <td className="px-4 py-2 font-mono">{row.range}</td>
                  <td className={`px-4 py-2 font-medium ${row.color}`}>
                    {row.label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
