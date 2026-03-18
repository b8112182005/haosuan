"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  calculateCarDepreciation,
  carBrandLabels,
  type CarBrand,
} from "@/lib/calculators/car-depreciation";
import CopyButton from "@/components/common/CopyButton";

const brands: CarBrand[] = ["japanese", "german", "american", "domestic"];
const brandShortLabels: Record<CarBrand, string> = {
  japanese: "日系",
  german: "德系",
  american: "美系",
  domestic: "國產",
};

function formatTWD(n: number) {
  if (n >= 100000000) {
    return `NT$${(n / 100000000).toFixed(2)} 億`;
  }
  if (n >= 10000) {
    return `NT$${(n / 10000).toFixed(1)} 萬`;
  }
  return `NT$${n.toLocaleString("zh-TW")}`;
}

export default function CarDepreciationCalculator() {
  const [purchasePrice, setPurchasePrice] = useState("800000");
  const [ageYears, setAgeYears] = useState("3");
  const [brand, setBrand] = useState<CarBrand>("japanese");

  const price = parseFloat(purchasePrice);
  const age = parseFloat(ageYears);

  const isValid =
    !isNaN(price) && price > 0 && !isNaN(age) && age >= 0 && age <= 30;

  const result = isValid ? calculateCarDepreciation(price, age, brand) : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">購車價格（元）</Label>
            <Input
              id="purchasePrice"
              type="number"
              inputMode="decimal"
              placeholder="例如：800000"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ageYears">車齡（年）</Label>
            <Input
              id="ageYears"
              type="number"
              inputMode="decimal"
              placeholder="例如：3"
              value={ageYears}
              onChange={(e) => setAgeYears(e.target.value)}
              min={0}
              max={30}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>品牌類型</Label>
          <div className="grid grid-cols-4 gap-2">
            {brands.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBrand(b)}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  brand === b
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {brandShortLabels[b]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {carBrandLabels[brand]}
          </p>
        </div>

        {result && result.residualValue > 0 && (
          <>
            <div className="rounded-xl bg-muted/50 p-6 text-center space-y-2">
              <div className="text-sm text-muted-foreground">估計殘值</div>
              <div className="text-5xl font-mono font-bold tracking-tight text-primary">
                {formatTWD(result.residualValue)}
              </div>
              <div className="text-sm text-muted-foreground">
                殘值率 {result.residualRate}%（年折舊率 {result.annualRate}%）
              </div>
              <div className="flex justify-center pt-1">
                <CopyButton
                  value={`估計殘值：${result.residualValue.toLocaleString("zh-TW")} 元（殘值率 ${result.residualRate}%）`}
                  label="複製結果"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "估計殘值", value: formatTWD(result.residualValue), color: "text-primary" },
                { label: "已折舊金額", value: formatTWD(result.depreciatedAmount), color: "text-red-400" },
                { label: "殘值率", value: `${result.residualRate}%`, color: "" },
                { label: "每年折舊", value: formatTWD(result.annualDepreciation), color: "" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                  <div className={`font-mono font-semibold text-xs sm:text-sm ${item.color}`}>
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
