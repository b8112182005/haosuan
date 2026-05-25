/**
 * 年齡計算機邏輯
 * 計算從生日到今天（或指定日期）的精確年齡
 */

export interface AgeResult {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  nextBirthdayDays: number;
  zodiac: string;
  chineseZodiac: string;
}

/**
 * 計算精確年齡
 * @param birthDate 生日
 * @param targetDate 計算基準日（預設今天）
 */
export function calculateAge(
  birthDate: Date,
  targetDate: Date = new Date()
): AgeResult {
  const birth = new Date(birthDate);
  const target = new Date(targetDate);

  let years = target.getFullYear() - birth.getFullYear();
  let months = target.getMonth() - birth.getMonth();
  let days = target.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(target.getFullYear(), target.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalDays = Math.floor(
    (target.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24)
  );

  // 下次生日還有幾天
  const thisYear = target.getFullYear();
  let nextBirthday = new Date(thisYear, birth.getMonth(), birth.getDate());
  if (nextBirthday <= target) {
    nextBirthday = new Date(thisYear + 1, birth.getMonth(), birth.getDate());
  }
  const nextBirthdayDays = Math.ceil(
    (nextBirthday.getTime() - target.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    years,
    months,
    days,
    totalDays,
    nextBirthdayDays,
    zodiac: getZodiac(birth),
    chineseZodiac: getChineseZodiac(birth.getFullYear()),
  };
}

function getZodiac(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return "牡羊座 ♈";
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return "金牛座 ♉";
  if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return "雙子座 ♊";
  if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return "巨蟹座 ♋";
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return "獅子座 ♌";
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return "處女座 ♍";
  if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return "天秤座 ♎";
  if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return "天蠍座 ♏";
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return "射手座 ♐";
  if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return "摩羯座 ♑";
  if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return "水瓶座 ♒";
  return "雙魚座 ♓";
}

function getChineseZodiac(year: number): string {
  const animals = [
    "鼠", "牛", "虎", "兔", "龍", "蛇",
    "馬", "羊", "猴", "雞", "狗", "豬",
  ];
  const index = ((year - 4) % 12 + 12) % 12;
  return animals[index] + "年";
}
