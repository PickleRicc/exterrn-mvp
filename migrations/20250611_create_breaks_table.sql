-- Create breaks table
CREATE TABLE breaks (
  id SERIAL PRIMARY KEY,
  time_entry_id INTEGER NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_minutes INTEGER,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for common queries
CREATE INDEX idx_breaks_time_entry_id ON breaks(time_entry_id);
CREATE INDEX idx_breaks_start_time ON breaks(start_time);

-- Add comment
COMMENT ON TABLE breaks IS 'Stores break periods during time entries for more accurate time tracking';
