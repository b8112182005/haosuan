"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { calculatePregnancy, formatDate, getMilestoneDate } from "@/lib/calculators/pregnancy";
import CopyButton from "@/components/common/CopyButton";

export default function PregnancyCalculator() {
  const [lmpDate, setLmpDate] = useState("");

  const lmp = lmpDate ? new Date(lmpDate) : null;
  const today = new Date();
  const result = lmp ? calculatePregnancy(lmp, today) : null;

  const trimesterLabel = result?.trimester
    ? `第 ${result.trimester} 孕期`
    : "";

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="lmpDate">最後一次月經第一天</Label>
          <Input
            id="lmpDate"
            type="date"
            value={lmpDate}
            onChange={(e) => setLmpDate(e.target.value)}
          />
        </div>

        {result && (
          <>
            <div className="rounded-xl bg-muted/50 p-6 text-center space-y-2">
              <div className="text-sm text-muted-foreground">目前懷孕週數</div>
              <div className="text-5xl font-mono font-bold tracking-tight text-primary">
                {result.currentWeeks} 週 {result.currentDays} 天
              </div>
              <div className="text-sm text-muted-foreground">
                {trimesterLabel}
                {result.isFullTerm && " ・ 已足月"}
              </div>
              <div className="flex justify-center pt-1">
                <CopyButton
                  value={`懷孕 ${result.currentWeeks} 週 ${result.currentDays} 天（${trimesterLabel}）\n預產期：${formatDate(result.dueDate)}${result.isFullTerm ? "\n已足月" : ""}`}
                  label="複製結果"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "懷孕週數", value: `${result.currentWeeks}W${result.currentDays}D` },
                { label: "孕期階段", value: trimesterLabel },
                { label: "預產期", value: formatDate(result.dueDate), color: "text-primary" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                  <div className={`font-mono font-semibold text-xs sm:text-sm ${item.color || ""}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">孕期里程碑</h3>
              <div className="space-y-1.5">
                {result.milestones.map((ms) => {
                  const msDate = lmp ? getMilestoneDate(lmp, ms.week) : null;
                  const isPast = result.currentWeeks >= ms.week;
                  return (
                    <div
                      key={ms.week}
                      className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
                        isPast
                          ? "border-primary/30 bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <div
                        className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                          isPast ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">
                            第 {ms.week} 週 — {ms.label}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {msDate ? formatDate(msDate) : ""}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {ms.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
