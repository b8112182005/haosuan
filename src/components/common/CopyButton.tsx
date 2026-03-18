"use client";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface CopyButtonProps {
  value: string;
  label?: string;
}

export default function CopyButton({ value, label = "複製" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      title="複製到剪貼板"
    >
      {copied
        ? <><Check className="h-3 w-3 text-green-600" />已複製</>
        : <><Copy className="h-3 w-3" />{label}</>}
    </button>
  );
}
