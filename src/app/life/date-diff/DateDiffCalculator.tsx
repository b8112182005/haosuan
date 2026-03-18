"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { calculateDateDiff } from "@/lib/calculators/date-diff";

export default function DateDiffCalculator() {
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  const isValid =
    start &&
    end &&
    !isNaN(start.getTime()) &&
    !isNaN(end.getTime()) &&
    startDate !== endDate;
  const result = isValid ? calculateDateDiff(start!, end!) : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="start-date">開始日期</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">結束日期</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {result && (
          <>
            {/* 主要結果 */}
            <div className="rounded-xl bg-muted/50 p-6 text-center space-y-2">
              <div className="text-sm text-muted-foreground">相差</div>
              <div className="text-5xl font-mono font-bold tracking-tight">
                {result.totalDays.toLocaleString()}
                <span className="text-2xl font-normal ml-1">天</span>
              </div>
              <div className="text-muted-foreground">
                {result.years > 0 && `${result.years} 年 `}
                {result.months > 0 && `${result.months} 個月 `}
                {result.days > 0 && `${result.days} 天`}
              </div>
            </div>

            {/* 詳細資訊 */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                {
                  label: "完整週數",
                  value: result.weeks.toLocaleString(),
                  unit: `週又 ${result.remainingDays} 天`,
                },
                {
                  label: "工作天數",
                  value: result.workdays.toLocaleString(),
                  unit: "天（不含例假日）",
                },
                {
                  label: "總天數",
                  value: result.totalDays.toLocaleString(),
                  unit: "天",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-border p-3 text-center"
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    {item.label}
                  </div>
                  <div className="font-mono font-semibold text-lg">
                    {item.value}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.unit}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!result && startDate === endDate && startDate && (
          <p className="text-center text-sm text-muted-foreground">
            請選擇兩個不同的日期
          </p>
        )}
      </CardContent>
    </Card>
  );
}
