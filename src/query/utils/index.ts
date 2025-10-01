import { Locale } from '@/types/content';

export function detectQueryLanguage(query: string): Locale {
  const chineseChars = (query.match(/[\u4e00-\u9fa5]/g) || []).length;
  const totalChars = query.length;

  return chineseChars / totalChars > 0.3 ? 'zh' : 'en';
}