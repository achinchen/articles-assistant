import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { contentConfig } from '@config/content.config';
import { SeriesMetadata } from '@/types/content';
import { getLocaleFromFilename, generateSeriesId } from '../utils/locale';

export interface ScanSeriesOptions {
  includeSeries?: string[] | null;
  excludeSeries?: string[];
  onlyStatus?: string[] | null;
  onlyLocales?: string[] | null;
}

export function scanSeries(options?: ScanSeriesOptions): Map<string, SeriesMetadata> {
  const seriesDir = path.join(
    process.cwd(),
    contentConfig.blogRoot,
    contentConfig.seriesPath || 'series'
  );

  if (!fs.existsSync(seriesDir)) {
    console.warn('⚠️  Series directory not found:', seriesDir);
    return new Map();
  }

  const files = fs.readdirSync(seriesDir).filter(f => 
    f.endsWith('.mdx') || f.endsWith('.md')
  );
  
  console.info(`📚 Found ${files.length} series files in ${seriesDir}`);

  const seriesMap = new Map<string, SeriesMetadata>();

  const includeSeries = options?.includeSeries ?? contentConfig.seriesFilter.includeSeries;
  const excludeSeries = options?.excludeSeries ?? contentConfig.seriesFilter.excludeSeries;
  const onlyStatus = options?.onlyStatus ?? contentConfig.seriesFilter.onlyStatus;

  for (const file of files) {
    const filePath = path.join(seriesDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    const { data: frontmatter, content: intro } = matter(fileContent);

    if (!frontmatter.slug) {
      console.warn(`  ⚠️  Skipping ${file}: missing 'slug' in frontmatter`);
      continue;
    }

    const locale = frontmatter.locale || getLocaleFromFilename(file);
    const seriesId = generateSeriesId(frontmatter.slug, locale);

    const series: SeriesMetadata = {
      slug: frontmatter.slug,
      name: frontmatter.name || frontmatter.title || frontmatter.slug,
      description: frontmatter.description || '',
      status: frontmatter.status || 'draft',
      locale,
      intro: intro.trim() || undefined,
      id: seriesId,
    };

    if (includeSeries && includeSeries.length > 0) {
      if (!includeSeries.includes(series.slug)) {
        console.info(`  ⏭️  Skipping ${file}: not in includeSeries`);
        continue;
      }
    }

    if (excludeSeries && excludeSeries.length > 0) {
      if (excludeSeries.includes(series.slug)) {
        console.info(`  ⏭️  Skipping ${file}: in excludeSeries`);
        continue;
      }
    }

    if (onlyStatus && onlyStatus.length > 0) {
      if (!onlyStatus.includes(series.status)) {
        console.info(`  ⏭️  Skipping ${file}: status '${series.status}' not allowed`);
        continue;
      }
    }

    seriesMap.set(seriesId, series);
    console.info(`  ✅ ${series.name} (${series.slug}) [${series.status}] [${series.locale}]`);
  }

  console.info(`\n📊 Total series loaded: ${seriesMap.size}`);

  return seriesMap;
}

export function getAvailableSeriesSlugs(): string[] {
  const seriesDir = path.join(
    process.cwd(),
    contentConfig.blogRoot,
    contentConfig.seriesPath || 'series'
  );

  if (!fs.existsSync(seriesDir)) {
    return [];
  }

  const files = fs.readdirSync(seriesDir).filter(f => 
    f.endsWith('.mdx') || f.endsWith('.md')
  );

  const slugs = new Set<string>();

  for (const file of files) {
    const filePath = path.join(seriesDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(fileContent);
    
    if (data.slug) {
      slugs.add(data.slug);
    }
  }

  return Array.from(slugs);
}

export function getSeriesLocales(slug: string): string[] {
  const seriesDir = path.join(
    process.cwd(),
    contentConfig.blogRoot,
    contentConfig.seriesPath || 'series'
  );

  if (!fs.existsSync(seriesDir)) {
    return [];
  }

  const files = fs.readdirSync(seriesDir).filter(f => 
    f.endsWith('.mdx') || f.endsWith('.md')
  );

  const locales: string[] = [];

  for (const file of files) {
    const filePath = path.join(seriesDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(fileContent);
    
    if (data.slug === slug) {
      const locale = data.locale || getLocaleFromFilename(file);
      locales.push(locale);
    }
  }

  return locales;
}