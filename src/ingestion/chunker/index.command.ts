import * as fs from 'fs';
import * as path from 'path';
import { contentConfig } from '@config/content.config';
import { Chunk, chunkText, countTokens, estimateChunkCount, stripFrontmatter } from '@/ingestion/chunker';
import { decode, encode } from 'gpt-3-encoder';

console.log('🔍 Testing chunking logic...\n');

const articlesDir = path.join(
  process.cwd(),
  contentConfig.blogRoot,
  contentConfig.articlesPath
);

const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));

if (files.length === 0) {
  console.error('❌ No articles found');
  process.exit(1);
}

const sampleFile = files[0];
const samplePath = path.join(articlesDir, sampleFile);
const content = fs.readFileSync(samplePath, 'utf-8');

console.log(`📄 Testing with: ${sampleFile}`);
console.log(`   Content length: ${content.length} chars`);
console.log(`   Token count: ${countTokens(content)}`);
console.log('');

const testCases = [
  { maxTokens: 500, overlap: 50 },
  { maxTokens: 1000, overlap: 100 },
  { maxTokens: 300, overlap: 30 },
];

testCases.forEach(({ maxTokens, overlap }) => {
  console.log(`\n📊 Test: maxTokens=${maxTokens}, overlap=${overlap}`);
  
  const estimated = estimateChunkCount(content, maxTokens, overlap);
  console.log(`   Estimated chunks: ${estimated}`);
  
  const chunks = chunkText(content, { maxTokens, overlap });
  console.log(`   Actual chunks: ${chunks.length}`);
  
  chunks.slice(0, 2).forEach((chunk, i) => {
    console.log(`\n   Chunk ${i}:`);
    console.log(`     Tokens: ${chunk.tokenCount}`);
    console.log(`     Preview: ${chunk.content.substring(0, 100).replace(/\n/g, ' ')}...`);
  });
  
if (chunks.length > 1) {
    const overlapText = getOverlapText(chunks[0], chunks[1], content);
    
    console.log(`\n   Overlap check:`);
    console.log(`     Overlap size: ${overlapText.length} tokens`);
    console.log(`     Overlap working: ${overlapText.length > 0 ? '✅' : '❌'}`);
    console.log(`     Overlap text: "${overlapText.substring(0, 100)}..."`);
  }
});


export function getOverlapText(chunk1: Chunk, chunk2: Chunk, originalText: string): string {
    const strippedText = stripFrontmatter(originalText);
    const tokens = encode(strippedText);
    
    const overlapStart = chunk2.metadata.startToken;
    const overlapEnd = chunk1.metadata.endToken;
    
    if (overlapStart >= overlapEnd) {
      return ''; // No overlap
    }
    
    const overlapTokens = tokens.slice(overlapStart, overlapEnd);
    return decode(overlapTokens);
  }
  
console.log('\n✅ Chunking test complete!');