/**
 * 網速換算
 * Mbps、Kbps、Gbps、MB/s、KB/s
 * 網路速度：1 byte = 8 bits
 */

export type NetworkSpeedUnit = "mbps" | "kbps" | "gbps" | "mbs" | "kbs";

export const networkSpeedLabels: Record<NetworkSpeedUnit, string> = {
  mbps: "Mbps（百萬位元/秒）",
  kbps: "Kbps（千位元/秒）",
  gbps: "Gbps（十億位元/秒）",
  mbs: "MB/s（百萬位元組/秒）",
  kbs: "KB/s（千位元組/秒）",
};

// 以 Mbps 為基準
const toMbps: Record<NetworkSpeedUnit, number> = {
  mbps: 1,
  kbps: 0.001,
  gbps: 1000,
  mbs: 8,       // 1 MB/s = 8 Mbps
  kbs: 0.008,   // 1 KB/s = 0.008 Mbps
};

export type NetworkSpeedResult = Record<NetworkSpeedUnit, number>;

export interface NetworkSpeedConversion {
  values: NetworkSpeedResult;
  useCases: NetworkUseCase[];
}

export interface NetworkUseCase {
  label: string;
  requiredMbps: number;
  sufficient: boolean;
}

const USE_CASES: Array<{ label: string; requiredMbps: number }> = [
  { label: "視訊會議（Zoom/Teams）", requiredMbps: 2 },
  { label: "HD 影片串流（720p）", requiredMbps: 5 },
  { label: "Full HD 串流（1080p）", requiredMbps: 10 },
  { label: "4K 影片串流（Netflix 建議）", requiredMbps: 25 },
  { label: "線上遊戲（一般）", requiredMbps: 10 },
  { label: "雲端備份 / 大檔案下載", requiredMbps: 50 },
];

/**
 * @param value 輸入數值
 * @param fromUnit 來源單位
 */
export function convertNetworkSpeed(
  value: number,
  fromUnit: NetworkSpeedUnit
): NetworkSpeedConversion {
  const zeroValues: NetworkSpeedResult = {
    mbps: 0, kbps: 0, gbps: 0, mbs: 0, kbs: 0,
  };

  if (isNaN(value) || value < 0) {
    return {
      values: zeroValues,
      useCases: USE_CASES.map((u) => ({ ...u, sufficient: false })),
    };
  }

  const mbps = value * toMbps[fromUnit];
  const values = {} as NetworkSpeedResult;

  for (const unit of Object.keys(toMbps) as NetworkSpeedUnit[]) {
    const converted = mbps / toMbps[unit];
    values[unit] = Math.round(converted * 10000) / 10000;
  }

  const useCases = USE_CASES.map((u) => ({
    ...u,
    sufficient: mbps >= u.requiredMbps,
  }));

  return { values, useCases };
}
