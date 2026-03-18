"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { calculateFuelCost, presetScenarios } from "@/lib/calculators/fuel-cost";
import CopyButton from "@/components/common/CopyButton";

export default function FuelCostCalculator() {
  const [distance, setDistance] = useState("100");
  const [fuelEfficiency, setFuelEfficiency] = useState("12");
  const [fuelPrice, setFuelPrice] = useState("32");

  const d = parseFloat(distance);
  const fe = parseFloat(fuelEfficiency);
  const fp = parseFloat(fuelPrice);

  const isValid =
    !isNaN(d) && d > 0 &&
    !isNaN(fe) && fe > 0 &&
    !isNaN(fp) && fp > 0;

  const result = isValid ? calculateFuelCost(d, fe, fp) : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div>
          <Label className="mb-2 block text-sm">快速預設路線</Label>
          <div className="flex flex-wrap gap-2">
            {presetScenarios.map((scenario) => (
              <button
                key={scenario.label}
                type="button"
                onClick={() => setDistance(String(scenario.distanceKm))}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {scenario.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="distance">行駛距離（km）</Label>
            <Input
              id="distance"
              type="number"
              inputMode="decimal"
              placeholder="例如：100"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fuelEfficiency">油耗（km/L）</Label>
            <Input
              id="fuelEfficiency"
              type="number"
              inputMode="decimal"
              placeholder="例如：12"
              value={fuelEfficiency}
              onChange={(e) => setFuelEfficiency(e.target.value)}
              step={0.1}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fuelPrice">油價（元/L）</Label>
            <Input
              id="fuelPrice"
              type="number"
              inputMode="decimal"
              placeholder="例如：32"
              value={fuelPrice}
              onChange={(e) => setFuelPrice(e.target.value)}
              step={0.1}
              min={0}
            />
          </div>
        </div>

        {result && result.totalCost > 0 && (
          <>
            <div className="rounded-xl bg-muted/50 p-6 text-center space-y-2">
              <div className="text-sm text-muted-foreground">預估油資費用</div>
              <div className="text-5xl font-mono font-bold tracking-tight text-primary">
                NT${result.totalCost.toLocaleString("zh-TW", { maximumFractionDigits: 0 })}
              </div>
              <div className="text-sm text-muted-foreground">
                行駛 {d.toLocaleString("zh-TW")} 公里，耗油 {result.fuelUsed} 公升
              </div>
              <div className="flex justify-center pt-1">
                <CopyButton
                  value={`行駛距離：${d.toLocaleString("zh-TW")} km\n油耗：${fe} km/L\n油價：${fp} 元/L\n耗油量：${result.fuelUsed} 公升\n油資費用：NT$${result.totalCost}\n每公里費用：NT$${result.costPerKm}`}
                  label="複製結果"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "耗油量", value: `${result.fuelUsed} L` },
                { label: "油資費用", value: `NT$${result.totalCost}`, color: "text-primary" },
                { label: "每公里費用", value: `NT$${result.costPerKm}` },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                  <div className={`font-mono font-semibold text-xs sm:text-sm ${item.color || ""}`}>
                    {item.value}
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
