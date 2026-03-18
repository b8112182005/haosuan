"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  convertNetworkSpeed,
  networkSpeedLabels,
  type NetworkSpeedUnit,
} from "@/lib/calculators/network-speed";
import CopyButton from "@/components/common/CopyButton";

const units: NetworkSpeedUnit[] = ["mbps", "kbps", "gbps", "mbs", "kbs"];

const unitShortLabels: Record<NetworkSpeedUnit, string> = {
  mbps: "Mbps",
  kbps: "Kbps",
  gbps: "Gbps",
  mbs: "MB/s",
  kbs: "KB/s",
};

export default function NetworkSpeedCalculator() {
  const [value, setValue] = useState("100");
  const [fromUnit, setFromUnit] = useState<NetworkSpeedUnit>("mbps");

  const val = parseFloat(value);
  const isValid = !isNaN(val) && val >= 0;
  const result = isValid ? convertNetworkSpeed(val, fromUnit) : null;

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
              placeholder="例如：100"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label>來源單位</Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
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
                  {unitShortLabels[u]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {result && val > 0 && (
          <>
            {/* 換算結果 */}
            <div className="space-y-2">
              <Label className="text-sm">換算結果</Label>
              {units.map((u) => (
                <div
                  key={u}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    u === fromUnit ? "border-primary/30 bg-primary/5" : "border-border"
                  }`}
                >
                  <div>
                    <div className="text-xs text-muted-foreground">
                      {networkSpeedLabels[u]}
                    </div>
                    <div className="font-mono font-semibold text-lg">
                      {result.values[u].toLocaleString("zh-TW")}
                    </div>
                  </div>
                  <CopyButton
                    value={`${result.values[u]} ${unitShortLabels[u]}`}
                    label="複製"
                  />
                </div>
              ))}
            </div>

            {/* 使用情境 */}
            <div className="space-y-2">
              <Label className="text-sm">使用情境參考</Label>
              <div className="space-y-1">
                {result.useCases.map((uc) => (
                  <div
                    key={uc.label}
                    className={`flex items-center justify-between rounded-lg border p-3 ${
                      uc.sufficient
                        ? "border-green-500/20 bg-green-500/5"
                        : "border-red-500/20 bg-red-500/5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {uc.sufficient ? "\u2705" : "\u274C"}
                      </span>
                      <div>
                        <div className="text-sm font-medium">{uc.label}</div>
                        <div className="text-xs text-muted-foreground">
                          需要 {uc.requiredMbps} Mbps
                        </div>
                      </div>
                    </div>
                    <div className={`text-xs font-medium ${
                      uc.sufficient ? "text-green-500" : "text-red-500"
                    }`}>
                      {uc.sufficient ? "足夠" : "不足"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
