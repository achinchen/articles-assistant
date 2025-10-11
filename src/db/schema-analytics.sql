-- src/db/schema-analytics.sql
-- Analytics and monitoring tables

-- Query logs
CREATE TABLE IF NOT EXISTS query_logs (
  id SERIAL PRIMARY KEY,
  query_text TEXT NOT NULL,
  query_locale VARCHAR(10),
  search_method VARCHAR(20), -- 'vector' or 'hybrid'
  
  -- Results
  chunks_retrieved INTEGER,
  chunks_used INTEGER,
  answer_length INTEGER,
  has_sources BOOLEAN DEFAULT false,
  
  -- Performance
  response_time_ms INTEGER,
  tokens_used INTEGER,
  model VARCHAR(50),
  
  -- Metadata
  request_id VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for query_logs
CREATE INDEX IF NOT EXISTS idx_query_logs_created_at ON query_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_query_logs_locale ON query_logs (query_locale);
CREATE INDEX IF NOT EXISTS idx_query_logs_model ON query_logs (model);

-- Feedback
CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  query_log_id INTEGER REFERENCES query_logs(id) ON DELETE CASCADE,
  
  -- Rating
  rating SMALLINT CHECK (rating IN (-1, 1)), -- -1 = thumbs down, 1 = thumbs up
  
  -- Optional detailed feedback
  feedback_text TEXT,
  feedback_category VARCHAR(50), -- 'incorrect', 'irrelevant', 'incomplete', 'helpful', 'excellent'
  
  -- Metadata
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for feedback
CREATE INDEX IF NOT EXISTS idx_feedback_query_log ON feedback (query_log_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback (rating);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback (created_at);

-- Performance metrics (aggregated per hour)
CREATE TABLE IF NOT EXISTS performance_metrics (
  id SERIAL PRIMARY KEY,
  hour_bucket TIMESTAMP NOT NULL,
  
  -- Query counts
  total_queries INTEGER DEFAULT 0,
  successful_queries INTEGER DEFAULT 0,
  failed_queries INTEGER DEFAULT 0,
  
  -- Performance stats
  avg_response_time_ms INTEGER,
  p50_response_time_ms INTEGER,
  p95_response_time_ms INTEGER,
  p99_response_time_ms INTEGER,
  
  -- Token usage
  total_tokens_used INTEGER DEFAULT 0,
  avg_tokens_per_query INTEGER,
  
  -- Feedback stats
  positive_feedback INTEGER DEFAULT 0,
  negative_feedback INTEGER DEFAULT 0,
  feedback_rate DECIMAL(5,2), -- percentage
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(hour_bucket)
);

-- Index for performance_metrics
CREATE INDEX IF NOT EXISTS idx_perf_metrics_hour ON performance_metrics (hour_bucket);

-- Cost tracking
CREATE TABLE IF NOT EXISTS cost_tracking (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  
  -- Token costs (OpenAI pricing)
  embedding_tokens INTEGER DEFAULT 0,
  embedding_cost DECIMAL(10,6) DEFAULT 0,
  
  prompt_tokens INTEGER DEFAULT 0,
  prompt_cost DECIMAL(10,6) DEFAULT 0,
  
  completion_tokens INTEGER DEFAULT 0,
  completion_cost DECIMAL(10,6) DEFAULT 0,
  
  total_cost DECIMAL(10,6) DEFAULT 0,
  
  -- Query count
  total_queries INTEGER DEFAULT 0,
  cost_per_query DECIMAL(10,6),
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(date)
);

-- Index for cost_tracking
CREATE INDEX IF NOT EXISTS idx_cost_tracking_date ON cost_tracking (date);

-- Popular queries (for insights)
CREATE TABLE IF NOT EXISTS popular_queries (
  id SERIAL PRIMARY KEY,
  query_normalized TEXT NOT NULL,
  query_count INTEGER DEFAULT 1,
  avg_rating DECIMAL(3,2),
  last_queried_at TIMESTAMP,
  
  UNIQUE(query_normalized)
);

-- Index for popular_queries
CREATE INDEX IF NOT EXISTS idx_popular_queries_count ON popular_queries (query_count DESC);

-- Failed queries (for debugging)
CREATE TABLE IF NOT EXISTS failed_queries (
  id SERIAL PRIMARY KEY,
  query_text TEXT NOT NULL,
  error_message TEXT,
  error_code VARCHAR(50),
  stack_trace TEXT,
  
  request_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for failed_queries
CREATE INDEX IF NOT EXISTS idx_failed_queries_created_at ON failed_queries (created_at);
CREATE INDEX IF NOT EXISTS idx_failed_queries_error_code ON failed_queries (error_code);

-- Create materialized view for dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_summary AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_queries,
  COUNT(CASE WHEN answer_length > 0 THEN 1 END) as successful_queries,
  AVG(response_time_ms) as avg_response_time,
  AVG(tokens_used) as avg_tokens,
  SUM(tokens_used) as total_tokens,
  COUNT(DISTINCT query_locale) as languages_used
FROM query_logs
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_analytics_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW analytics_summary;
END;
$$ LANGUAGE plpgsql;