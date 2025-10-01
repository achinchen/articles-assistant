import { query, formatSourcesForDisplay } from '@/query';
import { logger } from '@/utils/logger';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npm run query -- "<question>" [options]

Options:
  --locale <zh-TW|en>      Specify query language (auto-detect if not provided)
  --top-k <number>         Number of chunks to retrieve (default: 5)
  --model <model-name>     OpenAI model to use (default: gpt-4o-mini)
  --verbose                Show detailed metadata

Examples:
  npm run query -- "Senior 和 Staff Engineer 有什麼差別？"
  npm run query -- "What is technical leadership?" --locale en
  npm run query -- "如何晉升到 Staff？" --top-k 7 --verbose
  npm run query -- "Explain Staff Engineer role" --model gpt-4o
    `);
    process.exit(0);
  }
  
  // Parse arguments
  const queryText = args[0];
  const options: any = {};
  
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--locale':
        options.locale = args[++i] as 'zh-TW' | 'en';
        break;
      case '--top-k':
        options.topK = parseInt(args[++i], 10);
        break;
      case '--model':
        options.model = args[++i];
        break;
      case '--verbose':
        options.verbose = true;
        break;
    }
  }
  
  console.log('\n🤔 Question:', queryText);
  if (options.locale) {
    console.log('🌍 Language:', options.locale);
  }
  console.log('');
  
  try {
    const startTime = Date.now();
    
    const result = await query({
      query: queryText,
      locale: options.locale,
      config: {
        topK: options.topK,
        model: options.model,
      },
    });
    
    const elapsed = Date.now() - startTime;
    const isEnglish = result.metadata.queryLocale === 'en';
    
    // Display answer
    console.log(isEnglish ? '💡 Answer:' : '💡 回答：');
    console.log('─'.repeat(80));
    console.log(result.answer);
    console.log('─'.repeat(80));
    
    // Display sources
    if (result.sources.length > 0) {
      console.log(formatSourcesForDisplay(result.sources, result.metadata.queryLocale));
    }
    
    // Display metadata
    console.log(isEnglish ? '\n📊 Query Info:' : '\n📊 查詢資訊：');
    console.log(`  ⏱️  ${isEnglish ? 'Response time' : '回應時間'}: ${elapsed}ms`);
    console.log(`  🔍 ${isEnglish ? 'Retrieved' : '檢索到'}: ${result.metadata.chunksRetrieved} chunks`);
    console.log(`  📝 ${isEnglish ? 'Used' : '使用'}: ${result.metadata.chunksUsed} chunks`);
    console.log(`  🤖 ${isEnglish ? 'Model' : '模型'}: ${result.metadata.model}`);
    console.log(`  💬 ${isEnglish ? 'Language' : '語言'}: ${result.metadata.queryLocale}`);
    
    if (options.verbose) {
      console.log(isEnglish ? '\n🔬 Details:' : '\n🔬 詳細資訊：');
      console.log(isEnglish ? '  Token usage:' : '  Token 使用:');
      console.log(`    - Context: ${result.metadata.tokensUsed.context}`);
      console.log(`    - Prompt: ${result.metadata.tokensUsed.prompt}`);
      console.log(`    - Completion: ${result.metadata.tokensUsed.completion}`);
      console.log(`    - Total: ${result.metadata.tokensUsed.total}`);
      
      console.log(isEnglish ? '\n  Source similarity:' : '\n  來源相似度:');
      result.sources.forEach(source => {
        console.log(`    [${source.id}] ${source.similarity.toFixed(4)} - ${source.articleTitle}`);
      });
    }
    
    console.log('');
    
  } catch (error) {
    logger.error('Query failed:', error);
    console.error('\n❌ Query failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();