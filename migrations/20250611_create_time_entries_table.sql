-- Create time_entries table
CREATE TABLE time_entries (
  id SERIAL PRIMARY KEY,
  craftsman_id INTEGER NOT NULL REFERENCES users(id),
  appointment_id INTEGER REFERENCES appointments(id),
  customer_id INTEGER REFERENCES customers(id),
  description VARCHAR(255),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_minutes INTEGER,
  is_billable BOOLEAN DEFAULT true,
  hourly_rate DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for common queries
CREATE INDEX idx_time_entries_craftsman_id ON time_entries(craftsman_id);
CREATE INDEX idx_time_entries_appointment_id ON time_entries(appointment_id);
CREATE INDEX idx_time_entries_customer_id ON time_entries(customer_id);
CREATE INDEX idx_time_entries_start_time ON time_entries(start_time);

-- Add comment
COMMENT ON TABLE time_entries IS 'Stores time tracking entries for craftsmen work hours';
