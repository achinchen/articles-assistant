-- Add full-text search support to existing schema

-- 1. Add tsvector column to chunks table
ALTER TABLE chunks 
ADD COLUMN IF NOT EXISTS content_tsv tsvector;

-- 2. Create index for full-text search
CREATE INDEX IF NOT EXISTS chunks_content_tsv_idx 
ON chunks USING GIN(content_tsv);

-- 3. Create function to update tsvector
CREATE OR REPLACE FUNCTION chunks_content_tsv_update() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_tsv := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to auto-update tsvector
DROP TRIGGER IF EXISTS chunks_content_tsv_trigger ON chunks;
CREATE TRIGGER chunks_content_tsv_trigger
BEFORE INSERT OR UPDATE ON chunks
FOR EACH ROW
EXECUTE FUNCTION chunks_content_tsv_update();

-- 5. Populate existing data
UPDATE chunks SET content_tsv = to_tsvector('english', content);

-- 6. Create helper view for hybrid search results
CREATE OR REPLACE VIEW hybrid_search_view AS
SELECT 
  c.id as chunk_id,
  c.content,
  c.chunk_index,
  c.token_count,
  a.id as article_id,
  a.slug as article_slug,
  a.title as article_title,
  a.locale
FROM chunks c
JOIN articles a ON c.article_id = a.id;