"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { convertArea, AREA_UNITS, type AreaUnit } from "@/lib/calculators/area";

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
              {result.results.map(({ unit, value: converted }) => (
                <div
                  key={unit.key}
                  className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                    unit.key === fromUnit
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-muted/40"
                  }`}
                >
                  <span className="text-sm text-muted-foreground">{unit.label}</span>
                  <span className={`font-mono font-semibold ${unit.key === fromUnit ? "text-primary text-base" : "text-sm"}`}>
                    {converted >= 1000000
                      ? converted.toExponential(4)
                      : converted >= 0.0001 || converted === 0
                      ? parseFloat(converted.toPrecision(8)).toLocaleString()
                      : converted.toExponential(4)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
