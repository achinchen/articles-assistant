import type { ArticleWithSeries } from '@/types/content';
import { execSync } from 'child_process';
import { scanArticles } from '@/ingestion/scanner/posts';
import { pool, query } from '@/db/client';
import { chunkText, countTokens } from '@/ingestion/chunker';
import { generateEmbeddingsBatch, estimateEmbeddingCost } from '@/ingestion/embeddings';
import { logger } from '@/utils/logger';

export function updateSubmodule(): string {
  logger.info('📥 Updating submodule...');
  
  try {
    execSync('git submodule update --remote --merge', { 
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    logger.success('✅ Submodule updated');
  } catch (error) {
    logger.warn('⚠️  Submodule update failed, using existing content');
  }

  return getSubmoduleCommit();
}

export function getSubmoduleCommit(): string {
  try {
    const commit = execSync(
      'git rev-parse HEAD',
      { cwd: './content/blog', encoding: 'utf-8' }
    ).trim();
    
    logger.info(`📌 Submodule commit: ${commit}`);
    return commit;
  } catch (error) {
    logger.warn('⚠️  Could not get submodule commit');
    return 'unknown';
  }
}

export interface WorkloadStats {
  articleCount: number;
  totalTokens: number;
  totalChunks: number;
  estimatedCost: number;
}

export function calculateWorkload(articles: ArticleWithSeries[]): WorkloadStats {
  logger.info('\n📊 Calculating workload...');
  
  let totalTokens = 0;
  let totalChunks = 0;

  for (const article of articles) {
    const tokens = countTokens(article.content);
    const chunks = chunkText(article.content, { maxTokens: 500, overlap: 50 });
    totalTokens += tokens;
    totalChunks += chunks.length;
  }

  const estimatedCost = estimateEmbeddingCost(totalTokens);

  logger.print(`  Articles: ${articles.length}`);
  logger.print(`  Total tokens: ${totalTokens.toLocaleString()}`);
  logger.print(`  Total chunks: ${totalChunks}`);
  logger.print(`  Estimated cost: $${estimatedCost.toFixed(4)}`);

  return {
    articleCount: articles.length,
    totalTokens,
    totalChunks,
    estimatedCost,
  };
}

export interface IngestArticleOptions {
  article: ArticleWithSeries;
  submoduleCommit: string;
  progress?: string;
}

export async function ingestArticle(options: IngestArticleOptions): Promise<void> {
  const { article, submoduleCommit, progress = '' } = options;
  
  logger.info(`${progress} 📝 ${article.title} [${article.locale}]`);

  const enrichedFrontmatter = {
    ...article.frontmatter,
    _seriesMetadata: article.series || null,
  };

  const articleId = await insertArticle({
    slug: article.slug,
    title: article.title,
    content: article.content,
    locale: article.locale,
    frontmatter: enrichedFrontmatter,
    sourceFile: article.filePath,
    sourceCommit: submoduleCommit,
  });

  logger.success(`  ✅ Article saved (ID: ${articleId})`);

  const chunks = chunkText(article.content, { maxTokens: 500, overlap: 50 });
  logger.info(`  📄 Created ${chunks.length} chunks`);

  const chunkIds = await insertChunks(articleId, chunks);
  logger.success(`  ✅ Chunks saved`);

  await insertEmbeddings(chunkIds, chunks);
  logger.success(`  ✅ Embeddings saved`);
  logger.newline();
}

export interface InsertArticleParams {
  slug: string;
  title: string;
  content: string;
  locale: string;
  frontmatter: any;
  sourceFile: string;
  sourceCommit: string;
}

export async function insertArticle(params: InsertArticleParams): Promise<number> {
  const result = await query(
    `INSERT INTO articles (slug, title, content, locale, frontmatter, source_file, source_commit)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (slug, locale) DO UPDATE 
     SET title = $2, content = $3, frontmatter = $5, 
         source_file = $6, source_commit = $7, updated_at = NOW()
     RETURNING id`,
    [
      params.slug,
      params.title,
      params.content,
      params.locale,
      JSON.stringify(params.frontmatter),
      params.sourceFile,
      params.sourceCommit,
    ]
  );

  return result.rows[0].id;
}

export async function insertChunks(
  articleId: number, 
  chunks: Array<{ index: number; content: string; tokenCount: number; metadata: any }>
): Promise<number[]> {
  const chunkIds: number[] = [];

  for (const chunk of chunks) {
    const result = await query(
      `INSERT INTO chunks (article_id, chunk_index, content, token_count, metadata)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (article_id, chunk_index) DO UPDATE
       SET content = $3, token_count = $4, metadata = $5
       RETURNING id`,
      [
        articleId,
        chunk.index,
        chunk.content,
        chunk.tokenCount,
        JSON.stringify(chunk.metadata),
      ]
    );
    
    chunkIds.push(result.rows[0].id);
  }

  return chunkIds;
}

export async function insertEmbeddings(
  chunkIds: number[],
  chunks: Array<{ content: string }>
): Promise<void> {
  logger.info(`  🔮 Generating embeddings...`);
  
  const chunkTexts = chunks.map(c => c.content);
  const embeddings = await generateEmbeddingsBatch(chunkTexts);

  for (let i = 0; i < embeddings.length; i++) {
    await query(
      `INSERT INTO embeddings (chunk_id, embedding)
       VALUES ($1, $2)
       ON CONFLICT (chunk_id) DO UPDATE SET embedding = $2`,
      [chunkIds[i], JSON.stringify(embeddings[i])]
    );
  }
}

export interface DatabaseStats {
  totalArticles: number;
  totalChunks: number;
  totalEmbeddings: number;
  byLocale: Array<{ locale: string; count: number }>;
  bySeries: Array<{ 
    seriesSlug: string; 
    seriesName: string; 
    locale: string; 
    count: number 
  }>;
}

export async function getDatabaseStats(): Promise<DatabaseStats> {
  const totals = await query(`
    SELECT 
      COUNT(DISTINCT a.id) as article_count,
      COUNT(DISTINCT c.id) as chunk_count,
      COUNT(DISTINCT e.id) as embedding_count
    FROM articles a
    LEFT JOIN chunks c ON a.id = c.article_id
    LEFT JOIN embeddings e ON c.id = e.chunk_id
  `);

  const byLocale = await query(`
    SELECT 
      locale,
      COUNT(*) as count
    FROM articles
    GROUP BY locale
    ORDER BY locale
  `);

  const bySeries = await query(`
    SELECT 
      frontmatter->>'series' as series_slug,
      frontmatter->'_seriesMetadata'->>'name' as series_name,
      locale,
      COUNT(*) as count
    FROM articles
    WHERE frontmatter->>'series' IS NOT NULL
    GROUP BY series_slug, series_name, locale
    ORDER BY series_slug, locale
  `);

  return {
    totalArticles: parseInt(totals.rows[0].article_count),
    totalChunks: parseInt(totals.rows[0].chunk_count),
    totalEmbeddings: parseInt(totals.rows[0].embedding_count),
    byLocale: byLocale.rows.map(row => ({
      locale: row.locale,
      count: parseInt(row.count),
    })),
    bySeries: bySeries.rows.map(row => ({
      seriesSlug: row.series_slug,
      seriesName: row.series_name,
      locale: row.locale,
      count: parseInt(row.count),
    })),
  };
}

export function printDatabaseStats(stats: DatabaseStats): void {
  logger.info('\n📈 Database Statistics:\n');
  
  logger.info(`  Total Articles: ${stats.totalArticles}`);
  logger.info(`  Total Chunks: ${stats.totalChunks}`);
  logger.info(`  Total Embeddings: ${stats.totalEmbeddings}`);

  if (stats.byLocale.length > 0) {
    logger.info('\n  By Locale:');
    stats.byLocale.forEach(row => {
      logger.info(`    ${row.locale}: ${row.count} articles`);
    });
  }

  if (stats.bySeries.length > 0) {
    logger.info('\n  By Series:');
    stats.bySeries.forEach(row => {
      logger.info(`    [${row.locale}] ${row.seriesName}: ${row.count} articles`);
    });
  }
}

export interface IngestResult {
  successCount: number;
  errorCount: number;
  stats: DatabaseStats;
}

export async function ingestAllArticles(): Promise<IngestResult> {
  logger.info('🚀 Starting ingestion pipeline...\n');

  const submoduleCommit = updateSubmodule();
  logger.info('📖 Scanning articles...\n');
  const articles = scanArticles();

  if (articles.length === 0) {
    logger.warn('⚠️  No articles found to ingest');
    await pool.end();
    return {
      successCount: 0,
      errorCount: 0,
      stats: await getDatabaseStats(),
    };
  }

  calculateWorkload(articles);

  logger.info('💾 Ingesting articles...\n');
  
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < articles.length; i++) {
    const progress = `[${i + 1}/${articles.length}]`;
    
    try {
      await ingestArticle({
        article: articles[i],
        submoduleCommit,
        progress,
      });
      successCount++;
    } catch (error: any) {
      logger.error(`${progress} ❌ Error: ${error.message}`);
      logger.info('');
      errorCount++;
    }
  }

  logger.info('📊 Ingestion Summary\n');
  logger.info(`  ✅ Successful: ${successCount}`);
  if (errorCount > 0) {
    logger.info(`  ❌ Failed: ${errorCount}`);
  }

  const stats = await getDatabaseStats();
  printDatabaseStats(stats);

  logger.info('\n🎉 Ingestion complete!');
  
  await pool.end();

  return {
    successCount,
    errorCount,
    stats,
  };
}