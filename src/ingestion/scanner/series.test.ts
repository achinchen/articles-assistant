import { contentConfig } from '@config/content.config';
import { scanSeries, getAvailableSeriesSlugs, getSeriesLocales } from '@/ingestion/scanner/series';
import { SeriesMetadata } from '@/types/content';

console.log('📚 Available Series in Blog\n');

const allSlugs = getAvailableSeriesSlugs();

if (allSlugs.length === 0) {
  console.log('❌ No series found in content/blog/series/');
  process.exit(1);
}

console.log(`Total unique series: ${allSlugs.length}`);
console.log('');

allSlugs.forEach(slug => {
  const locales = getSeriesLocales(slug);
  console.log(`  ${slug}:`);
  console.log(`    Locales: ${locales.join(', ')}`);
});

console.log('🔍 Series that will be loaded (based on current config):\n');

const loadedSeries = scanSeries();

if (loadedSeries.size === 0) {
  console.log('⚠️  No series will be loaded with current config!');
  console.log('\nCurrent filter settings:');
  console.log('  includeSeries:', contentConfig.seriesFilter.includeSeries);
  console.log('  excludeSeries:', contentConfig.seriesFilter.excludeSeries);
  console.log('  onlyStatus:', contentConfig.seriesFilter.onlyStatus);
} else {

  const bySlug = new Map<string, SeriesMetadata[]>();
  
  loadedSeries.forEach(series => {
    if (!bySlug.has(series.slug)) {
      bySlug.set(series.slug, []);
    }
    bySlug.get(series.slug)!.push(series);
  });
  
  bySlug.forEach((seriesList, slug) => {
    console.log(`\n📖 ${slug}`);
    seriesList.forEach(series => {
      console.log(`\n   [${series.locale}] ${series.name}`);
      console.log(`   Status: ${series.status}`);
      console.log(`   Description: ${series.description}`);
      if (series.intro) {
        console.log(`   Intro: ${series.intro.substring(0, 100)}...`);
      }
    });
  });
}