-- Create time entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id SERIAL PRIMARY KEY,
  craftsman_id INTEGER NOT NULL REFERENCES craftsmen(id) ON DELETE CASCADE,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL, -- Optional link to appointment
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  break_duration INTEGER DEFAULT 0, -- Break duration in minutes
  description TEXT,
  billable BOOLEAN DEFAULT TRUE, -- Whether this time is billable to customer
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX idx_time_entries_craftsman ON time_entries(craftsman_id);
CREATE INDEX idx_time_entries_appointment ON time_entries(appointment_id);
CREATE INDEX idx_time_entries_start_time ON time_entries(start_time);

-- Auto-update updated_at timestamp
CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON time_entries
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
