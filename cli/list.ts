import { scanSeries, getAvailableSeriesSlugs, getSeriesLocales } from '@/ingestion/scanner/series';
import { scanArticles } from '@/ingestion/scanner/posts';
import { contentConfig } from '@config/content.config';

async function main() {
  const command = process.argv[2] || 'all';

  if (command === 'series' || command === 'all') {
    console.info('Available Series');

    const allSlugs = getAvailableSeriesSlugs();

    if (allSlugs.length === 0) {
      console.warn('No series found');
      return;
    }

    console.log(`Total unique series: ${allSlugs.length}\n`);

    allSlugs.forEach(slug => {
      const locales = getSeriesLocales(slug);
      console.log(`  ${slug}:`);
      console.log(`    Locales: ${locales.join(', ')}`);
    });

    console.log('\n' + '─'.repeat(50) + '\n');

    console.info('Series that will be loaded (based on current config):');
    const loadedSeries = scanSeries();

    if (loadedSeries.size === 0) {
      console.warn('No series will be loaded with current config!');
      console.log('\nCurrent filters:');
      console.log('  includeSeries:', contentConfig.seriesFilter.includeSeries);
      console.log('  excludeSeries:', contentConfig.seriesFilter.excludeSeries);
      console.log('  onlyStatus:', contentConfig.seriesFilter.onlyStatus);
    } else {
      loadedSeries.forEach(series => {
        console.log(`\n  [${series.locale}] ${series.name}`);
        console.log(`    Status: ${series.status}`);
        console.log(`    Description: ${series.description}`);
      });
    }
  }

  if (command === 'articles' || command === 'all') {
    if (command === 'all') {
      console.log('\n' + '='.repeat(50) + '\n');
    }
    
    console.info('Available Articles');

    const articles = scanArticles();

    if (articles.length === 0) {
      console.warn('No articles found');
      return;
    }

    const grouped = new Map<string, typeof articles>();
    
    articles.forEach(article => {
      const key = article.series 
        ? `${article.series.name} (${article.locale})`
        : `No Series (${article.locale})`;
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(article);
    });

    grouped.forEach((arts, groupName) => {
      console.log(`\n ● ${groupName} (${arts.length} articles):`);
      arts.forEach(a => {
        console.log(`   • ${a.title}`);
      });
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });