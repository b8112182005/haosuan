"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { convertTemperature, tempUnits, tempUnitLabels, type TempUnit } from "@/lib/calculators/temperature";

export default function TemperatureCalculator() {
  const [value, setValue] = useState("25");
  const [fromUnit, setFromUnit] = useState<TempUnit>("celsius");

  const numValue = parseFloat(value);
  const result = !isNaN(numValue) ? convertTemperature(numValue, fromUnit) : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* 來源單位選擇 */}
        <div className="space-y-2">
          <Label>來源單位</Label>
          <div className="grid grid-cols-3 gap-2">
            {tempUnits.map((unit) => (
              <button
                key={unit}
                className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                  fromUnit === unit
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted/50"
                }`}
                onClick={() => setFromUnit(unit)}
              >
                {unit === "celsius" ? "°C 攝氏" : unit === "fahrenheit" ? "°F 華氏" : "K 克耳文"}
              </button>
            ))}
          </div>
        </div>

        {/* 輸入 */}
        <div className="space-y-2">
          <Label htmlFor="temp-value">
            輸入{fromUnit === "celsius" ? "攝氏（°C）" : fromUnit === "fahrenheit" ? "華氏（°F）" : "克耳文（K）"}溫度
          </Label>
          <Input
            id="temp-value"
            type="number"
            inputMode="decimal"
            placeholder={fromUnit === "celsius" ? "例如：25" : fromUnit === "fahrenheit" ? "例如：77" : "例如：298"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>

        {/* 結果 */}
        {result ? (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">換算結果</h3>
            <div className="space-y-2">
              {/* 攝氏 */}
              <div className={`flex items-center justify-between rounded-lg px-4 py-3 ${fromUnit === "celsius" ? "bg-primary/10 border border-primary/30" : "bg-muted/40"}`}>
                <span className="text-sm text-muted-foreground">攝氏（°C）</span>
                <span className={`font-mono font-semibold ${fromUnit === "celsius" ? "text-primary text-lg" : "text-sm"}`}>
                  {result.celsius} °C
                </span>
              </div>
              {/* 華氏 */}
              <div className={`flex items-center justify-between rounded-lg px-4 py-3 ${fromUnit === "fahrenheit" ? "bg-primary/10 border border-primary/30" : "bg-muted/40"}`}>
                <span className="text-sm text-muted-foreground">華氏（°F）</span>
                <span className={`font-mono font-semibold ${fromUnit === "fahrenheit" ? "text-primary text-lg" : "text-sm"}`}>
                  {result.fahrenheit} °F
                </span>
              </div>
              {/* 克耳文 */}
              <div className={`flex items-center justify-between rounded-lg px-4 py-3 ${fromUnit === "kelvin" ? "bg-primary/10 border border-primary/30" : "bg-muted/40"}`}>
                <span className="text-sm text-muted-foreground">克耳文（K）</span>
                <span className={`font-mono font-semibold ${fromUnit === "kelvin" ? "text-primary text-lg" : "text-sm"}`}>
                  {result.kelvin} K
                </span>
              </div>
            </div>
          </div>
        ) : (
          value && <p className="text-sm text-muted-foreground">請輸入有效溫度值（克耳文不能為負數）</p>
        )}
      </CardContent>
    </Card>
  );
}
