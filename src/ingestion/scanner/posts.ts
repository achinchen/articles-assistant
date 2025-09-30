import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { contentConfig } from '@config/content.config';
import { ArticleWithSeries } from '@/types/content';
import { scanSeries } from '@/ingestion/scanner/series';
import { getLocaleFromFilename, generateSeriesId } from '../utils/locale';

export function scanArticles(): ArticleWithSeries[] {
  console.info('🔍 Loading series...\n');
  const seriesMap = scanSeries();

  if (seriesMap.size === 0) {
    console.warn('⚠️  No series loaded! Check your series files and filters.\n');
  }

  const articlesDir = path.join(
    process.cwd(),
    contentConfig.blogRoot,
    contentConfig.articlesPath
  );

  if (!fs.existsSync(articlesDir)) {
    throw new Error(`Articles directory not found: ${articlesDir}`);
  }

  const files = fs.readdirSync(articlesDir).filter(f => 
    f.endsWith('.mdx') || f.endsWith('.md')
  );
  
  console.info(`\n📁 Found ${files.length} article files in ${articlesDir}`);

  const articles: ArticleWithSeries[] = [];

  for (const file of files) {
    const filePath = path.join(articlesDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    const { data: frontmatter, content } = matter(fileContent);

    const locale = frontmatter.locale || getLocaleFromFilename(file);

    if (contentConfig.seriesFilter.enabled) {
      const articleSeriesSlug = frontmatter.series;

      if (articleSeriesSlug) {
        const seriesId = generateSeriesId(articleSeriesSlug, locale);
        
        if (!seriesMap.has(seriesId)) {
          console.info(`  ⏭️  Skipping ${file}: series '${seriesId}' not loaded`);
          continue;
        }
      } else {
        if (contentConfig.seriesFilter.includeSeries !== null) {
          console.info(`  ⏭️  Skipping ${file}: no series specified`);
          continue;
        }
      }


      if (contentConfig.seriesFilter.filePattern) {
        if (!contentConfig.seriesFilter.filePattern.test(file)) {
          console.info(`  ⏭️  Skipping ${file}: doesn't match file pattern`);
          continue;
        }
      }
    }

    const slug = frontmatter.slug || file.replace(/\.mdx?$/, '');
    const title = frontmatter.title || extractTitleFromContent(content) || slug;
    const seriesSlug = frontmatter.seriesSlug;
    const seriesId = seriesSlug ? generateSeriesId(seriesSlug, locale) : undefined;
    const series = seriesId ? seriesMap.get(seriesId) : undefined;

    const article: ArticleWithSeries = {
      slug,
      title,
      filePath,
      content,
      locale,
      frontmatter,
      series,
    };

    articles.push(article);
    
    const seriesTag = series ? `[${series.name}]` : '[No Series]';
    console.info(`  • ${file} → ${slug} ${seriesTag} [${locale}]`);
  }

  console.info(`\n📚 Total articles to process: ${articles.length}`);

  if (articles.length > 0) {
    printArticlesBySeriesAndLocale(articles);
  }

  return articles;
}

function extractTitleFromContent(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1] : null;
}

function printArticlesBySeriesAndLocale(articles: ArticleWithSeries[]) {
  console.info('\n📖 Articles by series and locale:');
  
  const grouped = new Map<string, ArticleWithSeries[]>();
  
  for (const article of articles) {
    const key = article.series 
      ? `${article.series.name} (${article.series.locale})`
      : 'No Series';
    
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(article);
  }
  
  grouped.forEach((arts, seriesKey) => {
    console.info(`\n  ● ${seriesKey} (${arts.length} articles):`);
    arts.forEach(a => console.info(`    • ${a.title}`));
  });
}