import { encode, decode } from 'gpt-3-encoder';

export interface Chunk {
  content: string;
  tokenCount: number;
  index: number;
  metadata: {
    startToken: number;
    endToken: number;
  };
}

export interface ChunkOptions {
  maxTokens?: number;
  overlap?: number;
  stripFrontmatter?: boolean;
}


export function stripFrontmatter(text: string): string {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  return text.replace(frontmatterRegex, '').trim();
}

/**
 * chunk text into chunks
 * @param text text to be chunked
 * @param options options for chunking
 * @returns chunks
 */
export function chunkText(
  text: string,
  options: ChunkOptions = {}
): Chunk[] {
  const { 
    maxTokens = 500, 
    overlap = 50,
  } = options;
  
  if (!text || text.trim().length === 0) {
    return [];
  }
  
  let processedText = stripFrontmatter(text);

  
  const tokens = encode(processedText);
  
  if (tokens.length === 0) {
    return [];
  }
  
  const chunks: Chunk[] = [];
  let startIdx = 0;
  let chunkIndex = 0;
  
  while (startIdx < tokens.length) {
    const endIdx = Math.min(startIdx + maxTokens, tokens.length);
    
    const chunkTokens = tokens.slice(startIdx, endIdx);
    
    const chunkText = decode(chunkTokens);
    
    chunks.push({
      content: chunkText.trim(),
      tokenCount: chunkTokens.length,
      index: chunkIndex,
      metadata: {
        startToken: startIdx,
        endToken: endIdx,
      },
    });
    // Move forward by (maxTokens - overlap)
    startIdx += maxTokens - overlap;
    chunkIndex++;
    
    // Prevent infinite loop
    if (startIdx >= tokens.length) {
      break;
    }
  }
  
  return chunks;
}

/**
 * count tokens in text
 * @param text text to count tokens
 * @param stripFm whether to strip frontmatter
 * @returns number of tokens
 */
export function countTokens(text: string, stripFm = true): number {
  const processedText = stripFm ? stripFrontmatter(text) : text;
  return encode(processedText).length;
}

/**
 * estimate number of chunks
 * @param text text to estimate chunks
 * @param maxTokens maximum number of tokens per chunk
 * @param overlap overlap between chunks
 * @param stripFm whether to strip frontmatter
 * @returns number of chunks
 */
export function estimateChunkCount(
  text: string,
  maxTokens: number = 500,
  overlap: number = 50,
  stripFm = true
): number {
  const tokenCount = countTokens(text, stripFm);
  
  if (tokenCount <= maxTokens) {
    return 1;
  }
  
  const step = maxTokens - overlap;
  return Math.ceil((tokenCount - maxTokens) / step) + 1;
}