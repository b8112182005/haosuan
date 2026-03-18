"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  convertVolume,
  volumeUnitLabels,
  type VolumeUnit,
} from "@/lib/calculators/volume";
import CopyButton from "@/components/common/CopyButton";

const units: VolumeUnit[] = ["liter", "milliliter", "gallon_us", "pint_us", "cup_tw"];

export default function VolumeCalculator() {
  const [value, setValue] = useState("1");
  const [fromUnit, setFromUnit] = useState<VolumeUnit>("liter");

  const val = parseFloat(value);
  const isValid = !isNaN(val) && val >= 0;
  const result = isValid ? convertVolume(val, fromUnit) : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="value">數值</Label>
            <Input
              id="value"
              type="number"
              inputMode="decimal"
              placeholder="例如：1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label>來源單位</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {units.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setFromUnit(u)}
                  className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                    fromUnit === u
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {volumeUnitLabels[u].split("(")[0].trim()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {result && val > 0 && (
          <div className="space-y-2">
            {units.map((u) => (
              <div
                key={u}
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  u === fromUnit ? "border-primary/30 bg-primary/5" : "border-border"
                }`}
              >
                <div>
                  <div className="text-xs text-muted-foreground">
                    {volumeUnitLabels[u]}
                  </div>
                  <div className="font-mono font-semibold text-lg">
                    {result[u].toLocaleString("zh-TW")}
                  </div>
                </div>
                <CopyButton
                  value={`${result[u]} ${volumeUnitLabels[u]}`}
                  label="複製"
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
