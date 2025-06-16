# Extern MVP - Time Tracking Module Plan

## Overview
This document outlines the plan for implementing a comprehensive time tracking module in the Extern MVP application. The module will allow craftsmen to track working hours, link them to appointments, manage breaks, and use tracked time for billing purposes.

## Requirements

### Core Functionality
1. Track work hours related to appointments
2. Support manual time entry
3. Log events (start, end, breaks, notes)
4. Calculate total hours worked
5. Link time entries to appointments
6. Generate reports for billing purposes

## Database Design

### TimeEntry Table
```sql
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
```

### Break Table
```sql
CREATE TABLE breaks (
  id SERIAL PRIMARY KEY,
  time_entry_id INTEGER NOT NULL REFERENCES time_entries(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_minutes INTEGER,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Backend Routes
1. `GET /api/time-entries` - List all time entries with filtering options
2. `GET /api/time-entries/:id` - Get details for a specific time entry
3. `POST /api/time-entries` - Create a new time entry
4. `PUT /api/time-entries/:id` - Update an existing time entry
5. `DELETE /api/time-entries/:id` - Delete a time entry
6. `POST /api/time-entries/:id/breaks` - Add a break to a time entry
7. `PUT /api/time-entries/:id/breaks/:breakId` - Update a break
8. `DELETE /api/time-entries/:id/breaks/:breakId` - Delete a break
9. `GET /api/time-entries/reports` - Generate reports for time tracking

## Frontend Components

### Time Tracker Dashboard
- Overview of recent time entries
- Summary statistics (hours worked today, this week, billable vs. non-billable)
- Quick action buttons (start/stop timer)

### Time Entry Form
- Manual entry fields (start time, end time, duration)
- Customer and appointment selection dropdowns
- Description and notes fields
- Billable toggle and hourly rate input
- Break management (add/edit/remove breaks)

### Timer Interface
- Active timer display with elapsed time
- Break button to pause the timer
- Task/description field to update while working
- Stop button to complete the time entry

### Time Entry List
- Filterable list of time entries
- Sort by date, customer, appointment, duration
- Edit/delete actions for existing entries
- Export capabilities for reporting

### Reports View
- Time summary by customer, project, or date range
- Billable hours calculation
- Export to PDF/CSV options

## Integration Points

### Appointment Integration
- Link time entries to specific appointments
- Auto-populate customer information when selecting an appointment
- Option to create time entries directly from appointment details

### Invoice Integration
- Use time entries to generate invoice line items
- Calculate billing based on tracked hours and hourly rates

### User Settings
- Default hourly rate
- Default work hours
- Time tracking preferences

## Implementation Plan

### Phase 1: Database and Backend Setup
- Create database migrations for time_entries and breaks tables
- Implement API controllers for time entry CRUD operations
- Implement API controllers for break management
- Add validation and business logic for time calculations

### Phase 2: Basic Frontend UI
- Create time entry list and detail views
- Implement basic manual time entry form
- Add filtering and sorting capabilities
- Integrate with appointments data

### Phase 3: Timer Functionality
- Build real-time timer component
- Implement start/pause/stop functionality
- Create break management UI
- Add notifications for long running timers

### Phase 4: Reporting and Analytics
- Create time summary reports by customer/project
- Implement billable hours calculations
- Add export functionality (PDF/CSV)
- Create dashboard with key metrics

### Phase 5: Invoice Integration
- Link time entries to invoice generation
- Add billing rate management
- Implement automatic invoice line item creation
- Add reporting for billable vs. non-billable time

## Technical Considerations
- Implement proper validation for overlapping time entries
- Ensure accurate time calculations across different time zones
- Store durations separately for accurate reporting
- Consider offline functionality for mobile usage
- Implement proper authentication/authorization for time entry access
