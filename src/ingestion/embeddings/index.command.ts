import 'tsconfig-paths/register';
import { generateEmbedding, generateEmbeddingsBatch, estimateEmbeddingCost } from '@/ingestion/embeddings';
import { countTokens } from '@/ingestion/chunker';

console.log('🧪 Testing OpenAI embeddings...\n');

async function test() {
  console.log('Test 1: Single embedding');
  const sampleText = "Staff Engineer focuses on technical leadership and cross-team impact.";
  const tokenCount = countTokens(sampleText);
  
  console.log(`  Text: "${sampleText}"`);
  console.log(`  Tokens: ${tokenCount}`);
  
  const embedding = await generateEmbedding(sampleText);
  
  console.log(`  ✅ Generated embedding with ${embedding.length} dimensions`);
  console.log(`  First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
  console.log('');
  
  console.log('Test 2: Batch embeddings');
  const batchTexts = [
    "Technical leadership is about influence, not authority.",
    "Staff Engineers focus on multiplying team effectiveness.",
    "Architecture decisions require balancing tradeoffs.",
  ];
  
  const totalTokens = batchTexts.reduce((sum, text) => sum + countTokens(text), 0);
  console.log(`  Texts: ${batchTexts.length}`);
  console.log(`  Total tokens: ${totalTokens}`);
  
  const batchEmbeddings = await generateEmbeddingsBatch(batchTexts);
  
  console.log(`  ✅ Generated ${batchEmbeddings.length} embeddings`);
  console.log(`  Each with ${batchEmbeddings[0].length} dimensions`);
  console.log('');
  
  console.log('Test 3: Cost estimation');
  const scenarios = [
    { name: 'Small blog (10 articles, 1500 tokens each)', tokens: 10 * 1500 },
    { name: 'Medium blog (50 articles, 2000 tokens each)', tokens: 50 * 2000 },
    { name: 'Large blog (100 articles, 2500 tokens each)', tokens: 100 * 2500 },
  ];
  
  scenarios.forEach(scenario => {
    const cost = estimateEmbeddingCost(scenario.tokens);
    console.log(`  ${scenario.name}:`);
    console.log(`    Tokens: ${scenario.tokens.toLocaleString()}`);
    console.log(`    Estimated cost: $${cost.toFixed(4)}`);
  });
  
  console.log('\n✅ All tests passed!');
}

test()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
