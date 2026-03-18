"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  calculatePaint,
  type PaintTarget,
  type CoatCount,
} from "@/lib/calculators/paint";

export default function PaintCalculator() {
  const [width, setWidth] = useState("4");
  const [length, setLength] = useState("5");
  const [height, setHeight] = useState("2.8");
  const [coatCount, setCoatCount] = useState<CoatCount>(2);
  const [target, setTarget] = useState<PaintTarget>("walls");
  const [windowDoor, setWindowDoor] = useState("3");

  const w = parseFloat(width);
  const l = parseFloat(length);
  const h = parseFloat(height);
  const wd = parseFloat(windowDoor) || 0;

  const isValid =
    !isNaN(w) && w > 0 &&
    !isNaN(l) && l > 0 &&
    !isNaN(h) && h > 0;

  const result = isValid
    ? calculatePaint({
        roomWidthM: w,
        roomLengthM: l,
        roomHeightM: h,
        coatCount,
        target,
        windowDoorArea: wd,
      })
    : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* 尺寸輸入 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="width">寬（公尺）</Label>
            <Input
              id="width"
              type="number"
              inputMode="decimal"
              placeholder="4"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              step={0.1}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="length">長（公尺）</Label>
            <Input
              id="length"
              type="number"
              inputMode="decimal"
              placeholder="5"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              step={0.1}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">高（公尺）</Label>
            <Input
              id="height"
              type="number"
              inputMode="decimal"
              placeholder="2.8"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              step={0.1}
              min={0}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* 塗刷區域 */}
          <div className="space-y-2">
            <Label>塗刷區域</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { value: "walls", label: "牆面" },
                  { value: "ceiling", label: "天花板" },
                  { value: "all", label: "全部" },
                ] as { value: PaintTarget; label: string }[]
              ).map(({ value, label }) => (
                <button
                  key={value}
                  className={`rounded-lg border py-2 text-sm transition-colors ${
                    target === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => setTarget(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 塗層次數 */}
          <div className="space-y-2">
            <Label>塗刷層數</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {([1, 2, 3] as CoatCount[]).map((n) => (
                <button
                  key={n}
                  className={`rounded-lg border py-2 text-sm transition-colors ${
                    coatCount === n
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => setCoatCount(n)}
                >
                  {n} 層
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 門窗扣除 */}
        <div className="space-y-2">
          <Label htmlFor="window-door">門窗扣除面積（m²，可選）</Label>
          <Input
            id="window-door"
            type="number"
            inputMode="decimal"
            placeholder="例如：3（預設扣除一門一窗）"
            value={windowDoor}
            onChange={(e) => setWindowDoor(e.target.value)}
            min={0}
          />
        </div>

        {result && (
          <>
            {/* 主要結果 */}
            <div className="rounded-xl bg-muted/50 p-6 text-center space-y-2">
              <div className="text-sm text-muted-foreground">建議用量</div>
              <div className="text-5xl font-mono font-bold tracking-tight">
                {result.litersNeeded}
                <span className="text-2xl font-normal ml-1">升</span>
              </div>
              <div className="text-sm text-muted-foreground">
                施工面積 {result.targetArea} m²・{coatCount} 層・含 10% 損耗
              </div>
            </div>

            {/* 建議桶數 */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "1 升裝", value: result.cansNeeded.small, unit: "桶" },
                { label: "5 升裝", value: result.cansNeeded.medium, unit: "桶" },
                { label: "10 升裝", value: result.cansNeeded.large, unit: "桶" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-border p-3 text-center"
                >
                  <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                  <div className="text-2xl font-mono font-bold">{item.value}</div>
                  <div className="text-xs text-muted-foreground">{item.unit}</div>
                </div>
              ))}
            </div>

            {/* 費用估算 */}
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="text-sm font-medium">費用估算（參考）</div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">DIY（僅材料費）</span>
                <span className="font-mono">NT${result.costEstimate.low.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">含師傅施工費</span>
                <span className="font-mono">NT${result.costEstimate.high.toLocaleString()}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
