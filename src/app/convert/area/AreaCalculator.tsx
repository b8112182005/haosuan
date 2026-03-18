"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { convertArea, AREA_UNITS, type AreaUnit } from "@/lib/calculators/area";
import CopyButton from "@/components/common/CopyButton";

export default function AreaCalculator() {
  const [value, setValue] = useState("1");
  const [fromUnit, setFromUnit] = useState<AreaUnit>("ping");

  const numValue = parseFloat(value);
  const result = !isNaN(numValue) && numValue >= 0 ? convertArea(numValue, fromUnit) : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* 輸入區 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="area-value">輸入數值</Label>
            <Input
              id="area-value"
              type="number"
              inputMode="decimal"
              placeholder="例如：10"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label>來源單位</Label>
            <div className="grid grid-cols-2 gap-2">
              {AREA_UNITS.map((unit) => (
                <button
                  key={unit.key}
                  className={`rounded-lg border py-2 px-3 text-sm font-medium transition-colors ${
                    fromUnit === unit.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => setFromUnit(unit.key)}
                >
                  {unit.labelShort}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 換算結果 */}
        {result && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">換算結果</h3>
            <div className="space-y-2">
              {result.results.map(({ unit, value: converted }) => {
                const displayValue = converted >= 1000000
                  ? converted.toExponential(4)
                  : converted >= 0.0001 || converted === 0
                  ? parseFloat(converted.toPrecision(8)).toLocaleString()
                  : converted.toExponential(4);
                return (
                  <div key={unit.key} className="space-y-1">
                    <div
                      className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                        unit.key === fromUnit
                          ? "bg-primary/10 border border-primary/30"
                          : "bg-muted/40"
                      }`}
                    >
                      <span className="text-sm text-muted-foreground">{unit.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-semibold ${unit.key === fromUnit ? "text-primary text-base" : "text-sm"}`}>
                          {displayValue}
                        </span>
                        {unit.key === "ping" && (
                          <CopyButton value={parseFloat(converted.toPrecision(8)).toString()} label="複製坪數" />
                        )}
                      </div>
                    </div>
                    {unit.key === "ping" && converted > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 text-right pr-4">
                        ≈ {(converted / 2.5).toFixed(1)} 個標準停車位（1 停車位 ≈ 2.5 坪）
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="rounded-lg bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
              <p>💡 看房時的「室內坪數」通常不含公設，登記坪數含公設比約 20～35%。</p>
              <p>例如登記 30 坪、公設比 30%，室內實際使用約 21 坪。</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
