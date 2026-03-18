"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  calculateAcBtu,
  type FloorLevel,
  type SunExposure,
  type RoomUsage,
} from "@/lib/calculators/ac-btu";

export default function AcBtuCalculator() {
  const [areaPing, setAreaPing] = useState("10");
  const [floorLevel, setFloorLevel] = useState<FloorLevel>("low");
  const [sunExposure, setSunExposure] = useState<SunExposure>("partial");
  const [roomUsage, setRoomUsage] = useState<RoomUsage>("bedroom");
  const [hasInsulation, setHasInsulation] = useState(false);

  const ping = parseFloat(areaPing);
  const isValid = !isNaN(ping) && ping > 0 && ping <= 100;
  const result = isValid
    ? calculateAcBtu({ areaPing: ping, floorLevel, sunExposure, roomUsage, hasInsulation })
    : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* 坪數 */}
        <div className="space-y-2">
          <Label htmlFor="area-ping">房間坪數</Label>
          <Input
            id="area-ping"
            type="number"
            inputMode="decimal"
            placeholder="例如：10"
            value={areaPing}
            onChange={(e) => setAreaPing(e.target.value)}
            step={0.5}
            min={1}
            max={100}
          />
        </div>

        {/* 樓層 */}
        <div className="space-y-2">
          <Label>樓層</Label>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(
              [
                { value: "low", label: "低樓層（1～5F）" },
                { value: "high", label: "高樓層（6F以上）" },
              ] as { value: FloorLevel; label: string }[]
            ).map(({ value, label }) => (
              <button
                key={value}
                className={`flex-1 py-2 text-sm transition-colors ${
                  floorLevel === value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => setFloorLevel(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 日照 */}
        <div className="space-y-2">
          <Label>日照狀況</Label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: "shaded", label: "遮蔭/北向" },
                { value: "partial", label: "半日照" },
                { value: "sunny", label: "西曬/頂樓" },
              ] as { value: SunExposure; label: string }[]
            ).map(({ value, label }) => (
              <button
                key={value}
                className={`rounded-lg border py-2 text-xs font-medium transition-colors ${
                  sunExposure === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted/50"
                }`}
                onClick={() => setSunExposure(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 用途 */}
        <div className="space-y-2">
          <Label>空間用途</Label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: "bedroom", label: "臥室" },
                { value: "living", label: "客廳" },
                { value: "office", label: "辦公/書房" },
              ] as { value: RoomUsage; label: string }[]
            ).map(({ value, label }) => (
              <button
                key={value}
                className={`rounded-lg border py-2 text-xs font-medium transition-colors ${
                  roomUsage === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted/50"
                }`}
                onClick={() => setRoomUsage(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 隔熱 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setHasInsulation(!hasInsulation)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              hasInsulation ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                hasInsulation ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <Label className="cursor-pointer" onClick={() => setHasInsulation(!hasInsulation)}>
            有隔熱措施（隔熱膜、氣密窗等）
          </Label>
        </div>

        {result && (
          <>
            {/* 主要結果 */}
            <div className="rounded-xl bg-muted/50 p-6 text-center space-y-2">
              <div className="text-sm text-muted-foreground">建議冷氣噸數</div>
              <div className="text-5xl font-mono font-bold tracking-tight">
                {result.requiredTons}
                <span className="text-2xl font-normal ml-1">噸</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {result.requiredBtu.toLocaleString()} BTU・{result.areaPing} 坪・{result.areaM2} m²
              </div>
            </div>

            {/* 適合規格 */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">建議選購規格</h3>
              <div className="space-y-2">
                {result.recommendedModels
                  .filter((m) => m.suitable)
                  .map((model) => (
                    <div
                      key={model.tons}
                      className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-primary">
                        {model.label}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {model.btu.toLocaleString()} BTU
                      </span>
                    </div>
                  ))}
                {result.recommendedModels.filter((m) => m.suitable).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    需要 {result.requiredBtu.toLocaleString()} BTU，請查詢商用規格
                  </p>
                )}
              </div>
            </div>

            {/* 建議 */}
            <div className="space-y-1.5">
              <h3 className="text-sm font-medium text-muted-foreground">選購建議</h3>
              {result.tips.map((tip, i) => (
                <div key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="shrink-0 text-primary">›</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
