"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  convertArea,
  formatAreaValue,
  AREA_UNITS,
  type AreaUnit,
} from "@/lib/calculators/area";

export default function AreaConverter() {
  const [value, setValue] = useState("10");
  const [fromUnit, setFromUnit] = useState<AreaUnit>("ping");

  const v = parseFloat(value);
  const isValid = !isNaN(v) && v >= 0;
  const result = isValid ? convertArea(v, fromUnit) : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* 輸入 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="area-value">數值</Label>
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
            <Label>單位</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value as AreaUnit)}
            >
              {AREA_UNITS.map((u) => (
                <option key={u.key} value={u.key}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 結果 */}
        {result && (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-2 bg-muted/30 text-xs font-medium text-muted-foreground">
              換算結果
            </div>
            <div className="divide-y divide-border/50">
              {result.results.map(({ unit, value: val }) => (
                <div
                  key={unit.key}
                  className={`flex items-center justify-between px-4 py-3 ${
                    unit.key === fromUnit ? "bg-primary/5 border-l-2 border-primary" : ""
                  }`}
                >
                  <span className="text-sm text-muted-foreground">{unit.label}</span>
                  <span
                    className={`font-mono text-sm ${
                      unit.key === fromUnit ? "font-bold text-primary" : ""
                    }`}
                  >
                    {formatAreaValue(val)} {unit.labelShort}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 常用換算表 */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-2 bg-muted/30 text-xs font-medium text-muted-foreground">
            常用換算關係
          </div>
          <div className="divide-y divide-border/50 text-xs text-muted-foreground">
            {[
              "1 坪 = 3.3058 m²",
              "1 坪 = 35.584 ft²",
              "1 m² = 0.3025 坪",
              "1 公頃 = 3,025 坪",
              "1 公頃 = 10,000 m²",
            ].map((r) => (
              <div key={r} className="px-4 py-2">{r}</div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
