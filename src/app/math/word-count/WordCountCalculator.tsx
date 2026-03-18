"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { countWords } from "@/lib/calculators/word-count";

export default function WordCountCalculator() {
  const [text, setText] = useState("");
  const result = countWords(text);

  const stats = [
    { label: "中文字數", value: result.chineseChars.toLocaleString(), highlight: true },
    { label: "英文單詞數", value: result.englishWords.toLocaleString(), highlight: true },
    { label: "總字元數（含空白）", value: result.totalCharsWithSpace.toLocaleString(), highlight: false },
    { label: "總字元數（不含空白）", value: result.totalCharsWithoutSpace.toLocaleString(), highlight: false },
    { label: "段落數", value: result.paragraphs.toLocaleString(), highlight: false },
    { label: "行數", value: result.lines.toLocaleString(), highlight: false },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 space-y-3">
          <Label htmlFor="word-count-text">貼入或輸入文字</Label>
          <textarea
            id="word-count-text"
            placeholder="在此貼入文章、文案、論文或任何文字..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
          />
          {text && (
            <div className="flex justify-end">
              <button
                onClick={() => setText("")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                清除
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 統計結果 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className={stat.highlight ? "border-primary/30" : ""}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-mono font-bold ${stat.highlight ? "text-primary" : ""}`}>
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
