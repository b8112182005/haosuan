"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { calculateElectricity, getCurrentSeason, type Season } from "@/lib/calculators/electricity";
import CopyButton from "@/components/common/CopyButton";

export default function ElectricityCalculator() {
  const [units, setUnits] = useState("");
  const [season, setSeason] = useState<Season>(getCurrentSeason());

  const u = parseFloat(units);
  const isValid = !isNaN(u) && u >= 0 && u <= 99999;
  const result = isValid ? calculateElectricity(u, season) : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="units">用電度數（度/月）</Label>
            <Input
              id="units"
              type="number"
              inputMode="decimal"
              placeholder="例如：300"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              min={0}
              max={99999}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="season">計費季節</Label>
            <select
              id="season"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={season}
              onChange={(e) => setSeason(e.target.value as Season)}
            >
              <option value="non-summer">非夏月（10月～5月）</option>
              <option value="summer">夏月（6月～9月）</option>
            </select>
          </div>
        </div>

        {result && (
          <>
            {/* 主要結果 */}
            <div className="rounded-xl bg-muted/50 p-6 text-center space-y-2">
              <div className="text-sm text-muted-foreground">本月電費（估算）</div>
              <div className="text-5xl font-mono font-bold tracking-tight">
                NT${result.totalCharge.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                平均 {result.avgPricePerUnit} 元 / 度
              </div>
              <div className="flex items-center justify-center gap-3 pt-1">
                <CopyButton value={result.totalCharge.toString()} label="複製金額" />
              </div>
              <div className="text-sm text-amber-500 dark:text-amber-400 pt-1">
                💡 相當於每天 {(result.totalCharge / 30).toFixed(0)} 元電費
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                約等於 {Math.round(result.totalCharge / 60)} 杯珍珠奶茶的價格（以 60 元/杯計算）
              </p>
              <div className="text-xs text-muted-foreground">費率依台電 2024 年住宅累進費率計算，如有調整請以台電官網公告為準</div>
            </div>

            {/* 費用明細 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm py-1 border-b border-border">
                <span className="text-muted-foreground">基本費</span>
                <span className="font-mono">NT${result.baseCharge}</span>
              </div>

              {result.breakdown.map((tier) => (
                <div
                  key={tier.tier}
                  className="flex justify-between text-sm py-1 border-b border-border/50"
                >
                  <span className="text-muted-foreground">
                    {tier.tier} ({tier.units} 度 × {tier.rate} 元)
                  </span>
                  <span className="font-mono">NT${tier.charge.toFixed(0)}</span>
                </div>
              ))}

              <div className="flex justify-between font-semibold pt-2">
                <span>合計</span>
                <span className="font-mono">NT${result.totalCharge.toLocaleString()}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
