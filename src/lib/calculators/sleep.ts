/**
 * 睡眠時間計算機邏輯
 * 依 90 分鐘睡眠週期理論，計算最佳入睡/起床時間
 */

export interface SleepTime {
  time: string;       // "HH:MM" 格式
  cycles: number;     // 完整睡眠週期數
  totalMinutes: number;
}

/** 入睡到真正進入睡眠的平均時間（分鐘） */
const FALL_ASLEEP_MINUTES = 15;

/** 睡眠週期長度（分鐘） */
const CYCLE_MINUTES = 90;

/**
 * 根據「想要的起床時間」，反推建議入睡時間
 * @param wakeTimeStr "HH:MM" 格式的起床時間
 * @param cyclesCount 建議返回的週期數組合數量
 */
export function getSleepTimes(
  wakeTimeStr: string,
  cyclesCount = 6
): SleepTime[] {
  const [wakeH, wakeM] = wakeTimeStr.split(":").map(Number);
  const wakeTotalMinutes = wakeH * 60 + wakeM;

  const results: SleepTime[] = [];

  for (let cycles = cyclesCount; cycles >= 1; cycles--) {
    const sleepDuration = cycles * CYCLE_MINUTES;
    let sleepMinutes =
      wakeTotalMinutes - sleepDuration - FALL_ASLEEP_MINUTES;

    // 允許跨午夜
    if (sleepMinutes < 0) sleepMinutes += 24 * 60;
    sleepMinutes = ((sleepMinutes % (24 * 60)) + 24 * 60) % (24 * 60);

    const h = Math.floor(sleepMinutes / 60);
    const m = sleepMinutes % 60;
    const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    results.push({ time, cycles, totalMinutes: sleepDuration });
  }

  return results;
}

/**
 * 根據「現在要入睡」，計算幾點起床最佳
 * @param sleepTimeStr "HH:MM" 格式的入睡時間（通常是當下時間）
 */
export function getWakeTimes(
  sleepTimeStr: string,
  cyclesCount = 6
): SleepTime[] {
  const [sleepH, sleepM] = sleepTimeStr.split(":").map(Number);
  const sleepTotalMinutes = sleepH * 60 + sleepM + FALL_ASLEEP_MINUTES;

  const results: SleepTime[] = [];

  for (let cycles = 1; cycles <= cyclesCount; cycles++) {
    const sleepDuration = cycles * CYCLE_MINUTES;
    let wakeMinutes = sleepTotalMinutes + sleepDuration;
    wakeMinutes = wakeMinutes % (24 * 60);

    const h = Math.floor(wakeMinutes / 60);
    const m = wakeMinutes % 60;
    const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    results.push({ time, cycles, totalMinutes: sleepDuration });
  }

  return results;
}

/** 格式化睡眠時長 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} 小時` : `${h} 小時 ${m} 分`;
}
