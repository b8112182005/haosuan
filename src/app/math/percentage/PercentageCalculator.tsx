"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { whatPercent, percentOf, percentChange } from "@/lib/calculators/percentage";

export default function PercentageCalculator() {
  // Mode 1: X 是 Y 的幾%
  const [m1x, setM1x] = useState("");
  const [m1y, setM1y] = useState("");
  // Mode 2: X 的 Y% 是多少
  const [m2x, setM2x] = useState("");
  const [m2y, setM2y] = useState("");
  // Mode 3: 從 X 到 Y 增減了幾%
  const [m3from, setM3from] = useState("");
  const [m3to, setM3to] = useState("");

  const result1 = whatPercent(parseFloat(m1x), parseFloat(m1y));
  const result2 = percentOf(parseFloat(m2x), parseFloat(m2y));
  const result3 = percentChange(parseFloat(m3from), parseFloat(m3to));

  return (
    <Tabs defaultValue="mode1">
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="mode1">X 是 Y 的幾%</TabsTrigger>
        <TabsTrigger value="mode2">X 的 Y% 是多少</TabsTrigger>
        <TabsTrigger value="mode3">增減幅度</TabsTrigger>
      </TabsList>

      {/* 模式1 */}
      <TabsContent value="mode1">
        <Card>
          <CardContent className="p-6 space-y-5">
            <p className="text-sm text-muted-foreground">計算：某數是另一數的百分之幾</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="m1x">數值 X</Label>
                <Input
                  id="m1x"
                  type="number"
                  inputMode="decimal"
                  placeholder="例如：25"
                  value={m1x}
                  onChange={(e) => setM1x(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m1y">基準數 Y</Label>
                <Input
                  id="m1y"
                  type="number"
                  inputMode="decimal"
                  placeholder="例如：200"
                  value={m1y}
                  onChange={(e) => setM1y(e.target.value)}
                />
              </div>
            </div>
            {result1 !== null && (
              <div className="rounded-xl bg-muted/50 p-6 text-center space-y-1">
                <div className="text-sm text-muted-foreground">{m1x} 是 {m1y} 的</div>
                <div className="text-5xl font-mono font-bold tracking-tight">
                  {result1}<span className="text-2xl font-normal ml-1">%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* 模式2 */}
      <TabsContent value="mode2">
        <Card>
          <CardContent className="p-6 space-y-5">
            <p className="text-sm text-muted-foreground">計算：某數的幾%是多少（折扣、分成）</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="m2x">原始數值 X</Label>
                <Input
                  id="m2x"
                  type="number"
                  inputMode="decimal"
                  placeholder="例如：1000"
                  value={m2x}
                  onChange={(e) => setM2x(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m2y">百分比 Y（%）</Label>
                <Input
                  id="m2y"
                  type="number"
                  inputMode="decimal"
                  placeholder="例如：15"
                  value={m2y}
                  onChange={(e) => setM2y(e.target.value)}
                />
              </div>
            </div>
            {result2 !== null && (
              <div className="rounded-xl bg-muted/50 p-6 text-center space-y-1">
                <div className="text-sm text-muted-foreground">{m2x} 的 {m2y}%</div>
                <div className="text-5xl font-mono font-bold tracking-tight">
                  {result2.toLocaleString()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* 模式3 */}
      <TabsContent value="mode3">
        <Card>
          <CardContent className="p-6 space-y-5">
            <p className="text-sm text-muted-foreground">計算：從某數到另一數，變化了幾%</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="m3from">原始值（From）</Label>
                <Input
                  id="m3from"
                  type="number"
                  inputMode="decimal"
                  placeholder="例如：100"
                  value={m3from}
                  onChange={(e) => setM3from(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m3to">目標值（To）</Label>
                <Input
                  id="m3to"
                  type="number"
                  inputMode="decimal"
                  placeholder="例如：120"
                  value={m3to}
                  onChange={(e) => setM3to(e.target.value)}
                />
              </div>
            </div>
            {result3 !== null && (
              <div className={`rounded-xl p-6 text-center space-y-1 ${
                result3.direction === "increase" ? "bg-green-50 dark:bg-green-950/30" :
                result3.direction === "decrease" ? "bg-red-50 dark:bg-red-950/30" :
                "bg-muted/50"
              }`}>
                <div className="text-sm text-muted-foreground">
                  {result3.direction === "increase" ? "增加了" : result3.direction === "decrease" ? "減少了" : "沒有變化"}
                </div>
                <div className={`text-5xl font-mono font-bold tracking-tight ${
                  result3.direction === "increase" ? "text-green-600 dark:text-green-400" :
                  result3.direction === "decrease" ? "text-red-600 dark:text-red-400" : ""
                }`}>
                  {result3.direction !== "same" && (
                    <>{result3.direction === "increase" ? "+" : "-"}{result3.change}<span className="text-2xl font-normal ml-1">%</span></>
                  )}
                  {result3.direction === "same" && "0%"}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
