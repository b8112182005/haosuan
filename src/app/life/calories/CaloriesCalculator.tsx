"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  calculateCalories,
  activityLabels,
  type Gender,
  type ActivityLevel,
} from "@/lib/calculators/calories";
import CopyButton from "@/components/common/CopyButton";

function formatKcal(n: number) {
  return `${n.toLocaleString("zh-TW")} kcal`;
}

export default function CaloriesCalculator() {
  const [gender, setGender] = useState<Gender>("male");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState<ActivityLevel>("sedentary");

  const a = parseFloat(age);
  const h = parseFloat(height);
  const w = parseFloat(weight);
  const isValid =
    !isNaN(a) && a > 0 && a <= 120 &&
    !isNaN(h) && h > 50 && h <= 300 &&
    !isNaN(w) && w > 1 && w <= 500;

  const result = isValid ? calculateCalories(gender, a, h, w, activity) : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* 性別切換 */}
        <div className="space-y-2">
          <Label>性別</Label>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {([
              { value: "male" as Gender, label: "男性" },
              { value: "female" as Gender, label: "女性" },
            ]).map(({ value, label }) => (
              <button
                key={value}
                className={`flex-1 py-2 text-sm transition-colors ${
                  gender === value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => setGender(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 基本資料 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="age">年齡（歲）</Label>
            <Input
              id="age"
              type="number"
              inputMode="decimal"
              placeholder="例如：30"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              min={1}
              max={120}
            />
          </div>
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

        {/* 活動量 */}
        <div className="space-y-2">
          <Label>活動量</Label>
          <div className="grid grid-cols-1 gap-2">
            {(Object.entries(activityLabels) as [ActivityLevel, string][]).map(([value, label]) => (
              <button
                key={value}
                className={`text-left px-4 py-2 rounded-lg border text-sm transition-colors ${
                  activity === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted/50"
                }`}
                onClick={() => setActivity(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 結果 */}
        {result && result.bmr > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-muted/50 p-5 text-center space-y-1">
                <div className="text-xs text-muted-foreground">基礎代謝率 BMR</div>
                <div className="text-3xl font-mono font-bold tracking-tight">
                  {result.bmr.toLocaleString("zh-TW")}
                </div>
                <div className="text-xs text-muted-foreground">kcal / 天</div>
              </div>
              <div className="rounded-xl bg-primary/10 p-5 text-center space-y-1">
                <div className="text-xs text-muted-foreground">每日所需熱量 TDEE</div>
                <div className="text-3xl font-mono font-bold tracking-tight text-primary">
                  {result.tdee.toLocaleString("zh-TW")}
                </div>
                <div className="text-xs text-muted-foreground">kcal / 天</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">減重目標</div>
                <div className="font-mono font-semibold text-sm text-orange-400">
                  {formatKcal(result.weightLossCalories)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">TDEE - 500（每週減約 0.5kg）</div>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">增肌目標</div>
                <div className="font-mono font-semibold text-sm text-green-400">
                  {formatKcal(result.weightGainCalories)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">TDEE + 300（緩慢增肌）</div>
              </div>
            </div>

            <div className="flex justify-center">
              <CopyButton
                value={`BMR: ${result.bmr} kcal, TDEE: ${result.tdee} kcal`}
                label="複製結果"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
