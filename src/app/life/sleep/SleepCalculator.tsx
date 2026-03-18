"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { getSleepTimes, getWakeTimes, formatDuration } from "@/lib/calculators/sleep";

type Mode = "wake" | "sleep";

export default function SleepCalculator() {
  const now = new Date();
  const nowStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const [mode, setMode] = useState<Mode>("wake");
  const [timeInput, setTimeInput] = useState(nowStr);

  const results =
    timeInput.match(/^\d{1,2}:\d{2}$/)
      ? mode === "wake"
        ? getSleepTimes(timeInput)
        : getWakeTimes(timeInput)
      : [];

  const recommended = results.find((r) => r.cycles === 5 || r.cycles === 6);

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* 模式切換 */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === "wake"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted/50"
            }`}
            onClick={() => setMode("wake")}
          >
            我要幾點起床
          </button>
          <button
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === "sleep"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted/50"
            }`}
            onClick={() => setMode("sleep")}
          >
            我現在要睡覺
          </button>
        </div>

        {/* 時間輸入 */}
        <div className="space-y-2">
          <Label htmlFor="time-input">
            {mode === "wake" ? "計劃起床時間" : "現在幾點（入睡時間）"}
          </Label>
          <Input
            id="time-input"
            type="time"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
          />
        </div>

        {/* 建議時間列表 */}
        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {mode === "wake"
                ? "建議入睡時間（完成 N 個睡眠週期）"
                : "建議起床時間（完成 N 個睡眠週期）"}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {results.map((r) => (
                <div
                  key={r.cycles}
                  className={`rounded-lg border p-3 text-center transition-colors ${
                    r.cycles === recommended?.cycles
                      ? "border-primary bg-primary/10"
                      : "border-border"
                  }`}
                >
                  <div
                    className={`text-2xl font-mono font-bold ${
                      r.cycles === recommended?.cycles ? "text-primary" : ""
                    }`}
                  >
                    {r.time}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {r.cycles} 個週期・{formatDuration(r.totalMinutes)}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              * 已加入 15 分鐘入睡緩衝時間
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
