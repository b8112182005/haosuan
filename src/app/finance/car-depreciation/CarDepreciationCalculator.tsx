"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  calculateCarDepreciation,
  CAR_BRANDS,
  BRAND_TYPE_LABELS,
  type CarBrandData,
} from "@/lib/calculators/car-depreciation";
import CopyButton from "@/components/common/CopyButton";

function formatTWD(n: number) {
  if (n >= 100000000) return `NT$${(n / 100000000).toFixed(2)} 億`;
  if (n >= 10000) return `NT$${(n / 10000).toFixed(1)} 萬`;
  return `NT$${n.toLocaleString("zh-TW")}`;
}

const TYPE_ORDER: CarBrandData["type"][] = ["japanese", "german", "american", "electric", "domestic"];

export default function CarDepreciationCalculator() {
  const [purchasePrice, setPurchasePrice] = useState("800000");
  const [ageYears, setAgeYears]           = useState("3");
  const [selectedBrandId, setSelectedBrandId] = useState("toyota");
  const [selectedModelId, setSelectedModelId] = useState("rav4");

  // 依類型分組
  const brandsByType = useMemo(() => {
    const map: Partial<Record<CarBrandData["type"], CarBrandData[]>> = {};
    for (const type of TYPE_ORDER) {
      map[type] = CAR_BRANDS.filter(b => b.type === type);
    }
    return map;
  }, []);

  const selectedBrand = CAR_BRANDS.find(b => b.id === selectedBrandId);
  const selectedModel = selectedBrand?.models.find(m => m.id === selectedModelId);
  const rate = selectedModel?.rate ?? 0.15;

  const price = parseFloat(purchasePrice);
  const age   = parseFloat(ageYears);
  const isValid = !isNaN(price) && price > 0 && !isNaN(age) && age >= 0 && age <= 30;

  const result = isValid ? calculateCarDepreciation(price, age, rate) : null;

  function handleBrandSelect(brandId: string) {
    setSelectedBrandId(brandId);
    const brand = CAR_BRANDS.find(b => b.id === brandId);
    if (brand?.models.length) setSelectedModelId(brand.models[0].id);
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* 基本資訊 */}
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

        {/* 品牌選擇（依類型分組） */}
        <div className="space-y-3">
          <Label>品牌</Label>
          {TYPE_ORDER.map((type) => {
            const brands = brandsByType[type] ?? [];
            if (!brands.length) return null;
            return (
              <div key={type} className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">
                  {BRAND_TYPE_LABELS[type]}
                </p>
                <div className="flex flex-wrap gap-2">
                  {brands.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleBrandSelect(b.id)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        selectedBrandId === b.id
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 車款選擇 */}
        {selectedBrand && (
          <div className="space-y-2">
            <Label>車款</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {selectedBrand.models.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedModelId(m.id)}
                  className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
                    selectedModelId === m.id
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <div>{m.name}</div>
                  <div className="text-xs opacity-60 mt-0.5">折舊 {(m.rate * 100).toFixed(0)}%/年</div>
                </button>
              ))}
            </div>
            {selectedModel?.note && (
              <p className="text-xs text-muted-foreground">
                💡 {selectedModel.note}
              </p>
            )}
          </div>
        )}

        {/* 結果 */}
        {result && result.residualValue > 0 && (
          <>
            <div className="rounded-xl bg-muted/50 p-6 text-center space-y-2">
              <div className="text-sm text-muted-foreground">
                {selectedBrand?.name} {selectedModel?.name} · 車齡 {ageYears} 年估計殘值
              </div>
              <div className="text-5xl font-mono font-bold tracking-tight text-primary">
                {formatTWD(result.residualValue)}
              </div>
              <div className="text-sm text-muted-foreground">
                殘值率 {result.residualRate}%（年折舊率 {result.annualRate.toFixed(0)}%）
              </div>
              <div className="flex justify-center pt-1">
                <CopyButton
                  value={`${selectedBrand?.name} ${selectedModel?.name} 車齡 ${ageYears} 年估計殘值：${result.residualValue.toLocaleString("zh-TW")} 元（殘值率 ${result.residualRate}%）`}
                  label="複製結果"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "估計殘值",   value: formatTWD(result.residualValue),      color: "text-primary" },
                { label: "已折舊金額", value: formatTWD(result.depreciatedAmount),   color: "text-red-400" },
                { label: "殘值率",     value: `${result.residualRate}%`,             color: "" },
                { label: "每年折舊",   value: formatTWD(result.annualDepreciation),  color: "" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                  <div className={`font-mono font-semibold text-xs sm:text-sm ${item.color}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              ※ 以複利折舊法計算，僅供參考。實際殘值依車況、里程、市場供需而異。
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
