import { contentConfig } from '@config/content.config';

export function getLocaleFromFilename(filename: string): string {
  const pattern = contentConfig.locales.fileNamePattern;
  const match = filename.match(pattern);
  
  if (match && match[1]) {
    return match[1];
  }
  
  return contentConfig.locales.default;
}

export function generateSeriesId(slug: string, locale: string): string {
  return `${slug}:${locale}`;
}

export function parseSeriesId(seriesId: string): { slug: string; locale: string } {
  const [slug, locale] = seriesId.split(':');
  return { slug, locale };
}