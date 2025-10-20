-- Create function for matching articles based on embedding similarity
CREATE OR REPLACE FUNCTION match_articles (
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 5,
  locale_filter text DEFAULT NULL
)
RETURNS TABLE (
  id integer,
  title text,
  content text,
  frontmatter jsonb,
  locale text,
  slug text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT DISTINCT ON (a.id)
    a.id,
    a.title,
    a.content, -- Use article content, not chunk content for context
    a.frontmatter,
    a.locale,
    a.slug,
    1 - (e.embedding <=> query_embedding) as similarity
  FROM articles a
  JOIN chunks c ON c.article_id = a.id
  JOIN embeddings e ON e.chunk_id = c.id
  WHERE 
    (locale_filter IS NULL OR a.locale = locale_filter)
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY a.id, e.embedding <=> query_embedding
  LIMIT match_count;
$$;