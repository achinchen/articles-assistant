import { scanArticles } from '@/ingestion/scanner/posts';
import { ingestArticle, getSubmoduleCommit } from '@/ingestion';
import { pool } from '@/db/client';
import { logger } from '@/utils/logger';

async function main() {
  const [slug, locale = 'zh'] = process.argv.slice(2);

  if (!slug) {
    logger.error('Usage: npm run ingest:article <slug> [locale]');
    logger.info('Example: npm run ingest:article 01-role-differences zh');
    process.exit(1);
  }

  logger.info(`Looking for article: ${slug} [${locale}]`);

  const articles = scanArticles();
  const article = articles.find(a => a.slug === slug && a.locale === locale);

  if (!article) {
    logger.error(`Article not found: ${slug} [${locale}]`);
    logger.info('\nAvailable articles:');
    articles.forEach(a => {
      console.log(`  - ${a.slug} [${a.locale}]`);
    });
    process.exit(1);
  }

  const submoduleCommit = getSubmoduleCommit();
  
  await ingestArticle({ article, submoduleCommit });

  logger.success('Article ingestion complete!');
  await pool.end();
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    logger.error('Error:', error);
    process.exit(1);
  });