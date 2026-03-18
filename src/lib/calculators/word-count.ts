/**
 * 字數計算機邏輯
 */

export interface WordCountResult {
  chineseChars: number;    // 中文字數
  englishWords: number;    // 英文單詞數
  totalCharsWithSpace: number;   // 總字元數（含空白）
  totalCharsWithoutSpace: number; // 總字元數（不含空白）
  paragraphs: number;      // 段落數
  lines: number;           // 行數
}

/**
 * 計算文字統計
 */
export function countWords(text: string): WordCountResult {
  if (!text) {
    return {
      chineseChars: 0,
      englishWords: 0,
      totalCharsWithSpace: 0,
      totalCharsWithoutSpace: 0,
      paragraphs: 0,
      lines: 0,
    };
  }

  // 中文字數：匹配 CJK 統一表意文字（含標點符號不算，只算漢字）
  const chineseMatches = text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g);
  const chineseChars = chineseMatches ? chineseMatches.length : 0;

  // 英文單詞數：以空白、標點分隔的連續英文字母
  const englishMatches = text.match(/[a-zA-Z]+/g);
  const englishWords = englishMatches ? englishMatches.length : 0;

  // 總字元數（含空白）
  const totalCharsWithSpace = text.length;

  // 總字元數（不含空白）
  const totalCharsWithoutSpace = text.replace(/\s/g, "").length;

  // 段落數：以連續換行分隔，非空段落才計算
  const paragraphs = text
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0).length;

  // 行數：以換行符分隔
  const lines = text.split(/\n/).length;

  return {
    chineseChars,
    englishWords,
    totalCharsWithSpace,
    totalCharsWithoutSpace,
    paragraphs,
    lines,
  };
}
