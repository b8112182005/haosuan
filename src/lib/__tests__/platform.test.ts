import { describe, expect, it } from 'vitest';
import { searchConsoleVerification } from '../platform';

describe('Search Console 驗證碼', () => {
  it('app 建置：兩個來源都有也不輸出（不能退回 NEXT_PUBLIC_GSC_VERIFICATION）', () => {
    expect(searchConsoleVerification(true, 'server-code', 'public-code')).toBeUndefined();
    expect(searchConsoleVerification(true, undefined, 'public-code')).toBeUndefined();
    expect(searchConsoleVerification(true, 'server-code', undefined)).toBeUndefined();
  });

  it('網頁版：GOOGLE_SITE_VERIFICATION 優先，沒有就用 NEXT_PUBLIC_GSC_VERIFICATION', () => {
    expect(searchConsoleVerification(false, 'server-code', 'public-code')).toBe('server-code');
    expect(searchConsoleVerification(false, undefined, 'public-code')).toBe('public-code');
    expect(searchConsoleVerification(false, '', 'public-code')).toBe('public-code');
  });

  it('網頁版沒設任何一個：不輸出', () => {
    expect(searchConsoleVerification(false, undefined, undefined)).toBeUndefined();
    expect(searchConsoleVerification(false, '', '')).toBeUndefined();
  });
});
