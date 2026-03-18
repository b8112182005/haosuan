"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { calculateAge } from "@/lib/calculators/age";

export default function AgeCalculator() {
  const [birthDate, setBirthDate] = useState("");

  const birth = birthDate ? new Date(birthDate) : null;
  const isValid = birth && !isNaN(birth.getTime()) && birth < new Date();
  const result = isValid ? calculateAge(birth!) : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="birthdate">生日</Label>
          <Input
            id="birthdate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
          />
        </div>

        {result && (
          <>
            {/* 主要結果 */}
            <div className="rounded-xl bg-muted/50 p-6 text-center space-y-2">
              <div className="text-sm text-muted-foreground">您的年齡</div>
              <div className="text-5xl font-mono font-bold tracking-tight">
                {result.years}
                <span className="text-2xl font-normal ml-1">歲</span>
              </div>
              <div className="text-muted-foreground text-base">
                {result.months} 個月 {result.days} 天
              </div>
            </div>

            {/* 詳細資訊 */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "總天數", value: result.totalDays.toLocaleString(), unit: "天" },
                { label: "下次生日", value: result.nextBirthdayDays.toString(), unit: "天後" },
                { label: "星座", value: result.zodiac, unit: "" },
                { label: "生肖", value: result.chineseZodiac, unit: "" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-border p-3 text-center"
                >
                  <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                  <div className="font-mono font-semibold text-base">
                    {item.value}
                    {item.unit && (
                      <span className="text-xs font-normal ml-0.5">{item.unit}</span>
                    )}
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
