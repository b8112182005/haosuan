"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { calculateTile } from "@/lib/calculators/tile";
import CopyButton from "@/components/common/CopyButton";

// common tile sizes in cm
const COMMON_SIZES = [
  { label: "30×30", l: 30, w: 30 },
  { label: "45×45", l: 45, w: 45 },
  { label: "60×60", l: 60, w: 60 },
  { label: "80×80", l: 80, w: 80 },
  { label: "30×60", l: 30, w: 60 },
  { label: "自訂", l: 0, w: 0 },
];

export default function TileCalculator() {
  const [area, setArea] = useState("20");
  const [tileLength, setTileLength] = useState("60");
  const [tileWidth, setTileWidth] = useState("60");
  const [wastage, setWastage] = useState("10");
  const [joint, setJoint] = useState("3");
  const [selectedSize, setSelectedSize] = useState("60×60");

  const handleSizeSelect = (size: typeof COMMON_SIZES[0]) => {
    setSelectedSize(size.label);
    if (size.l > 0) {
      setTileLength(size.l.toString());
      setTileWidth(size.w.toString());
    }
  };

  const a = parseFloat(area);
  const l = parseFloat(tileLength);
  const w = parseFloat(tileWidth);
  const wastParsed = parseFloat(wastage);
  const jParsed = parseFloat(joint);
  const wast = isNaN(wastParsed) ? 10 : wastParsed;
  const j = isNaN(jParsed) ? 3 : jParsed;

  const isValid = !isNaN(a) && a > 0 && !isNaN(l) && l > 0 && !isNaN(w) && w > 0;
  const result = isValid
    ? calculateTile({
        areaM2: a,
        tileLengthCm: l,
        tileWidthCm: w,
        wastagePercent: wast,
        jointWidthMm: j,
      })
    : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* 施工面積 */}
        <div className="space-y-2">
          <Label htmlFor="area">施工面積（平方公尺）</Label>
          <Input
            id="area"
            type="number"
            inputMode="decimal"
            placeholder="例如：20"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            min={0}
          />
        </div>

        {/* 磁磚尺寸快選 */}
        <div className="space-y-2">
          <Label>磁磚尺寸（公分）</Label>
          <div className="flex flex-wrap gap-2">
            {COMMON_SIZES.map((size) => (
              <button
                key={size.label}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedSize === size.label
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted/50"
                }`}
                onClick={() => handleSizeSelect(size)}
              >
                {size.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tile-length" className="text-xs">長（cm）</Label>
              <Input
                id="tile-length"
                type="number"
                inputMode="decimal"
                value={tileLength}
                onChange={(e) => { setTileLength(e.target.value); setSelectedSize("自訂"); }}
                min={1}
              />
            </div>
            <div>
              <Label htmlFor="tile-width" className="text-xs">寬（cm）</Label>
              <Input
                id="tile-width"
                type="number"
                inputMode="decimal"
                value={tileWidth}
                onChange={(e) => { setTileWidth(e.target.value); setSelectedSize("自訂"); }}
                min={1}
              />
            </div>
          </div>
        </div>

        {/* 進階設定 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="wastage">損耗率（%）</Label>
            <Input
              id="wastage"
              type="number"
              inputMode="decimal"
              placeholder="10"
              value={wastage}
              onChange={(e) => setWastage(e.target.value)}
              min={0}
              max={30}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="joint">縫隙寬度（mm）</Label>
            <Input
              id="joint"
              type="number"
              inputMode="decimal"
              placeholder="3"
              value={joint}
              onChange={(e) => setJoint(e.target.value)}
              min={0}
              max={20}
            />
          </div>
        </div>

        {result && (
          <>
            {/* 主要結果 */}
            <div className="rounded-xl bg-muted/50 p-6 text-center space-y-2">
              <div className="text-sm text-muted-foreground">需要磁磚</div>
              <div className="text-5xl font-mono font-bold tracking-tight">
                {result.totalQuantity}
                <span className="text-2xl font-normal ml-1">片</span>
              </div>
              <div className="text-sm text-muted-foreground">
                基礎 {result.baseQuantity} 片 + 損耗 {result.wastageQuantity} 片
              </div>
              <div className="flex items-center justify-center gap-3 pt-1">
                <CopyButton value={result.totalQuantity.toString()} label="複製片數" />
              </div>
              <div className="text-sm text-amber-500 dark:text-amber-400 pt-1">
                💡 建議多買 {Math.ceil(result.totalQuantity * 0.1)} 片備料（約 10%）以防破損補貼
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                建議多買 10% 備用 = 共 {result.totalQuantity + Math.ceil(result.totalQuantity * 0.1)} 片
              </p>
            </div>

            {/* 詳細 */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "每箱（10片）", value: `${result.boxesNeeded} 箱` },
                { label: "每平方公尺", value: `${result.tilesPerSqm} 片` },
                { label: "施工費用（低）", value: `NT$${result.costEstimate.low.toLocaleString()}` },
                { label: "施工費用（高）", value: `NT$${result.costEstimate.high.toLocaleString()}` },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-border p-3 text-center"
                >
                  <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                  <div className="font-mono font-semibold">{item.value}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
