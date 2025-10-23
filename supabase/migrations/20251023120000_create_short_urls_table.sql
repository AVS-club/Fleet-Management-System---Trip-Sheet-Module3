-- Create table for storing short URL mappings
-- This replaces the in-memory storage and persists URLs across sessions

CREATE TABLE IF NOT EXISTS short_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Indexes for performance
  CONSTRAINT short_id_length CHECK (char_length(short_id) >= 6)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_short_urls_short_id ON short_urls(short_id);
CREATE INDEX IF NOT EXISTS idx_short_urls_expires_at ON short_urls(expires_at);
CREATE INDEX IF NOT EXISTS idx_short_urls_created_by ON short_urls(created_by);

-- Enable Row Level Security
ALTER TABLE short_urls ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can resolve short URLs (read)
CREATE POLICY "Anyone can resolve short URLs"
  ON short_urls
  FOR SELECT
  USING (expires_at > NOW());

-- Policy: Authenticated users can create short URLs
CREATE POLICY "Authenticated users can create short URLs"
  ON short_urls
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can delete their own short URLs
CREATE POLICY "Users can delete their own short URLs"
  ON short_urls
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Function to automatically delete expired URLs (runs daily)
CREATE OR REPLACE FUNCTION cleanup_expired_short_urls()
RETURNS void AS $$
BEGIN
  DELETE FROM short_urls
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on table
COMMENT ON TABLE short_urls IS 'Stores short URL mappings for document sharing with expiration';
COMMENT ON COLUMN short_urls.short_id IS 'The short identifier used in the URL path (e.g., "abc123")';
COMMENT ON COLUMN short_urls.original_url IS 'The full Supabase signed URL that the short URL redirects to';
COMMENT ON COLUMN short_urls.access_count IS 'Number of times this short URL has been accessed';
COMMENT ON COLUMN short_urls.expires_at IS 'When this short URL expires and should no longer work';