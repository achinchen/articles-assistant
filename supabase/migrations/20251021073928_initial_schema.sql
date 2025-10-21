-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Articles table
CREATE TABLE articles (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  locale VARCHAR(10) NOT NULL DEFAULT 'zh-TW',
  
  -- Metadata
  frontmatter JSONB DEFAULT '{}',
  source_file VARCHAR(500),
  source_commit VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint on slug + locale
  UNIQUE(slug, locale)
);

-- Indexes for articles
CREATE INDEX idx_articles_locale ON articles(locale);
CREATE INDEX idx_articles_series ON articles((frontmatter->>'series'));
CREATE INDEX idx_articles_series_locale ON articles((frontmatter->>'series'), locale);

-- Chunks table
CREATE TABLE chunks (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(article_id, chunk_index)
);

-- Index for chunks
CREATE INDEX idx_chunks_article ON chunks(article_id);

-- Embeddings table
CREATE TABLE embeddings (
  id SERIAL PRIMARY KEY,
  chunk_id INTEGER REFERENCES chunks(id) ON DELETE CASCADE,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(chunk_id)
);

CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE TABLE queries (
  id SERIAL PRIMARY KEY,
  query_text TEXT NOT NULL,
  response TEXT,
  chunks_used INTEGER[],
  feedback SMALLINT, -- 1 for =M, -1 for =N, NULL for no feedback
  session_id VARCHAR(255),
  locale VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_queries_created_at ON queries(created_at DESC);
CREATE INDEX idx_queries_locale ON queries(locale);
CREATE INDEX idx_queries_feedback ON queries(feedback) WHERE feedback IS NOT NULL;