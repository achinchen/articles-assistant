import { query } from './client';

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
  // Total counts
  const totals = await query(`
    SELECT 
      COUNT(DISTINCT a.id) as article_count,
      COUNT(DISTINCT c.id) as chunk_count,
      COUNT(DISTINCT e.id) as embedding_count
    FROM articles a
    LEFT JOIN chunks c ON a.id = c.article_id
    LEFT JOIN embeddings e ON c.id = e.chunk_id
  `);

  // By locale
  const byLocale = await query(`
    SELECT locale, COUNT(*) as count
    FROM articles
    GROUP BY locale
    ORDER BY locale
  `);

  // By series
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

export async function getArticleBySlug(slug: string, locale: string) {
  const result = await query(
    `SELECT * FROM articles WHERE slug = $1 AND locale = $2`,
    [slug, locale]
  );
  return result.rows[0];
}

export async function searchSimilarChunks(
  queryEmbedding: number[],
  topK: number = 5,
  locale?: string
) {
  const localeFilter = locale ? `AND a.locale = $2` : '';
  const params = locale ? [JSON.stringify(queryEmbedding), locale] : [JSON.stringify(queryEmbedding)];
  
  const result = await query(`
    SELECT 
      c.content,
      a.title,
      a.slug,
      a.locale,
      a.frontmatter->'_seriesMetadata'->>'name' as series_name,
      1 - (e.embedding <=> $1::vector) as similarity
    FROM embeddings e
    JOIN chunks c ON e.chunk_id = c.id
    JOIN articles a ON c.article_id = a.id
    ${localeFilter}
    ORDER BY e.embedding <=> $1::vector
    LIMIT ${topK}
  `, params);

  return result.rows;
}

export async function checkDataIntegrity() {
  const articlesWithoutChunks = await query(`
    SELECT COUNT(*) as count
    FROM articles a
    LEFT JOIN chunks c ON a.id = c.article_id
    WHERE c.id IS NULL
  `);

  const chunksWithoutEmbeddings = await query(`
    SELECT COUNT(*) as count
    FROM chunks c
    LEFT JOIN embeddings e ON c.id = e.chunk_id
    WHERE e.id IS NULL
  `);

  return {
    articlesWithoutChunks: parseInt(articlesWithoutChunks.rows[0].count),
    chunksWithoutEmbeddings: parseInt(chunksWithoutEmbeddings.rows[0].count),
  };
}
