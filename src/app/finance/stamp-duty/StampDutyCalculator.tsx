"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  calculateStampDuty,
  stampDutyLabels,
  type StampDutyType,
} from "@/lib/calculators/stamp-duty";
import CopyButton from "@/components/common/CopyButton";

const dutyTypes: StampDutyType[] = ["sale", "gift", "other"];

export default function StampDutyCalculator() {
  const [amount, setAmount] = useState("10000000");
  const [type, setType] = useState<StampDutyType>("sale");

  const val = parseFloat(amount);
  const isValid = !isNaN(val) && val > 0;
  const result = isValid ? calculateStampDuty(val, type) : null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">交易金額（元）</Label>
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              placeholder="例如：10000000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={0}
            />
          </div>

          <div className="space-y-2">
            <Label>交易類型</Label>
            <div className="grid grid-cols-3 gap-2">
              {dutyTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    type === t
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {t === "sale" ? "買賣" : t === "gift" ? "贈與" : "其他"}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {stampDutyLabels[type]}
            </p>
          </div>
        </div>

        {result && result.stampDuty > 0 && (
          <>
            <div className="rounded-xl bg-muted/50 p-6 text-center space-y-2">
              <div className="text-sm text-muted-foreground">印花稅金額</div>
              <div className="text-5xl font-mono font-bold tracking-tight text-primary">
                NT${result.stampDuty.toLocaleString("zh-TW")}
              </div>
              <div className="text-sm text-muted-foreground">
                適用費率：{result.rate}%
              </div>
              <div className="flex justify-center pt-1">
                <CopyButton
                  value={`印花稅：${result.stampDuty.toLocaleString("zh-TW")} 元（費率 ${result.rate}%）`}
                  label="複製結果"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">
                  交易金額
                </div>
                <div className="font-mono font-semibold text-sm">
                  NT${val.toLocaleString("zh-TW")}
                </div>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">
                  適用費率
                </div>
                <div className="font-mono font-semibold text-sm text-primary">
                  {result.rate}%
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
