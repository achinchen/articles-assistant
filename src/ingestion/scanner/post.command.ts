import { scanArticles } from '@/ingestion/scanner/posts';

console.log('🔍 Scanning articles from submodule...\n');

try {
  const articles = scanArticles();

  console.log('\n📊 Summary:');
  articles.forEach(article => {
    console.log(`${article.title} / length: ${article.content.length} chars`);
  });
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
}