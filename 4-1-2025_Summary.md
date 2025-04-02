# Extern MVP - Development Summary (April 1, 2025)

## Overview
Today we made significant enhancements to the Extern MVP platform, focusing on database schema improvements, user-craftsmen relationship management, and adding new API endpoints for craftsmen. These changes support the core functionality of connecting craftsmen with customers and managing appointments.

## Database Schema Changes

### 1. Added Role to Users Table
```sql
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer';
```
This change enables user role differentiation between customers and craftsmen.

### 2. Linked Craftsmen to Users
```sql
ALTER TABLE craftsmen ADD COLUMN user_id INTEGER REFERENCES users(id);
CREATE INDEX ON craftsmen (user_id);
```
This establishes a relationship between user accounts and craftsmen profiles.

### 3. Adding Craftsmen with User Accounts
```sql
-- Begin transaction
BEGIN;

-- Insert user
INSERT INTO users (email, password, username, role)
VALUES ('hanz.zimmer@extern.de', 'hashedpassword', 'hanzzimmer', 'craftsman')
RETURNING id;

-- Insert craftsman with that user ID
INSERT INTO craftsmen (name, phone, specialty, user_id)
VALUES ('Hanz Zimmer', '+491234567890', 'Plumbing', [user_id]);

-- Commit transaction
COMMIT;
```

## New Files Created

### Backend Files

1. **controllers/craftsmenController.js**
   - Purpose: Handles all craftsmen-related business logic
   - Key functions:
     - `getAllCraftsmen`: Retrieves all craftsmen with filtering options
     - `getCraftsmanById`: Gets a specific craftsman by ID
     - `updateCraftsman`: Updates craftsman details
     - `getCraftsmanAppointments`: Gets all appointments for a craftsman

2. **routes/craftsmen.js**
   - Purpose: Defines API routes for craftsmen
   - Endpoints:
     - GET `/craftsmen`: List all craftsmen (public)
     - GET `/craftsmen/:id`: Get craftsman details (public)
     - PUT `/craftsmen/:id`: Update craftsman (protected)
     - GET `/craftsmen/:id/appointments`: Get craftsman appointments (protected)

## Modified Files

### Backend Files

1. **controllers/authController.js**
   - Added support for role, phone, and specialty during registration
   - Enhanced login to include craftsman information in response
   - Added transaction support for creating linked user and craftsman records
   - Updated JWT token to include role and craftsman ID

2. **index.js**
   - Added craftsmen routes to the main server file
   - Added test endpoint for verification

### Frontend Files

1. **extern-frontend/app/auth/register/page.js**
   - Added role selection dropdown (customer/craftsman)
   - Added conditional fields for craftsmen (phone, specialty)
   - Added validation for craftsman-specific fields

2. **extern-frontend/app/lib/api.js**
   - Updated authAPI.register to include role, phone, and specialty
   - Added craftsmenAPI with methods for accessing craftsmen endpoints

## New API Endpoints

### Craftsmen Endpoints
- **GET /craftsmen**
  - Purpose: List all craftsmen
  - Query parameters: name, specialty
  - Response: Array of craftsmen with basic info

- **GET /craftsmen/:id**
  - Purpose: Get detailed information about a specific craftsman
  - Response: Craftsman object with all details

- **PUT /craftsmen/:id**
  - Purpose: Update craftsman information
  - Authentication: Required
  - Authorization: Only the craftsman owner or admin
  - Body: name, phone, specialty, availability_hours

- **GET /craftsmen/:id/appointments**
  - Purpose: Get all appointments for a craftsman
  - Authentication: Required
  - Response: Array of appointments

### Enhanced Auth Endpoints
- **POST /auth/register**
  - Updated to support craftsman registration
  - New payload:
    ```json
    {
      "username": "testcraftsman",
      "email": "craftsman@example.com",
      "password": "password123",
      "role": "craftsman",
      "phone": "+491234567890",
      "specialty": "Plumbing"
    }
    ```

- **POST /auth/login**
  - Enhanced response to include role and craftsman information

## Important Commands Used

### Database Commands
```sql
-- View database tables
\dt

-- View table structure
\d tablename

-- View table data
SELECT * FROM tablename;

-- Join tables to view relationships
SELECT u.id, u.username, u.email, u.role, c.id, c.name, c.phone
FROM users u
JOIN craftsmen c ON u.id = c.user_id;
```

### Git Commands
```bash
# Add all changes to staging
git add .

# Commit changes
git commit -m "Add craftsmen endpoints"

# Push changes to remote repository
git push origin main
```

### Server Commands
```bash
# Restart the server (using Docker)
docker restart container_name

# Or using PM2
pm2 restart all
```

## Next Steps
1. Create frontend pages for craftsmen management
2. Implement availability management for craftsmen
3. Enhance appointment scheduling to check craftsman availability
4. Add filtering and search functionality for craftsmen

---

This summary documents the changes made on April 1, 2025, to the Extern MVP platform, focusing on connecting users and craftsmen tables and adding craftsmen API endpoints.

---

## Section 2: Additional Enhancements (April 1, 2025 - Afternoon)

### 1. Improved Craftsmen Registration

#### Problem Identified
- Username was being used as the craftsman's display name, causing confusion and inconsistency

#### Solution Implemented
- Added a separate "name" field in the registration form for craftsmen
- Updated authController.js to accept and process the name field
- Modified the frontend registration page to collect the name
- Updated the API utility to pass the name parameter

#### Implementation Details
```javascript
// In authController.js
const { username, email, password, role, phone, specialty, name } = req.body;
// ...
// Use the provided name or fallback to username if not provided
const craftsmanName = name || username;
      
await pool.query(
  `INSERT INTO craftsmen (name, phone, specialty, user_id) 
   VALUES ($1, $2, $3, $4)`,
  [craftsmanName, phone, specialty || '', userId]
);
```

### 2. Craftsmen Availability Endpoint

#### New Endpoint Created
- `GET /craftsmen/:id/availability` - Check craftsman availability for a specific date/time

#### Features
- Accepts date (required) and time (optional) parameters
- Checks if craftsman works on the requested day
- Checks if the requested time is within working hours
- Searches for conflicting appointments

#### Implementation Details
```javascript
// Example request
GET http://3.127.139.32:3000/craftsmen/1/availability?date=2025-04-05&time=10:00

// Example response
{
  "available": true,
  "craftsman": {
    "id": 1,
    "name": "Hanz Zimmer",
    "workingHours": ["9:00-17:00"]
  },
  "appointments": []
}
```

#### Integration with n8n
For n8n workflows, use the following URL format:
```
http://3.127.139.32:3000/craftsmen/{{ $('Get Craftsman ID').item.json.user_id }}/availability?date={{ encodeURIComponent($('Process Craftsman Availability').item.json.date) }}&time={{ encodeURIComponent($('Process Craftsman Availability').item.json.time) }}
```

### 3. Craftsmen-User Linking Script

#### Problem Identified
- Existing craftsmen records were missing user_id values
- This prevented proper authentication and profile management

#### Solution Implemented
- Created a script (scripts/link-craftsmen-users.js) that:
  - Finds craftsmen without user_id
  - Attempts to match them with existing users by name
  - Creates new user accounts for craftsmen without matches
  - Updates craftsmen records with the appropriate user_id

#### Implementation Details
```javascript
// Find all craftsmen without user_id
const craftsmenResult = await pool.query(`
  SELECT * FROM craftsmen WHERE user_id IS NULL
`);

// For each craftsman, find or create a user account
for (const craftsman of craftsmenResult.rows) {
  // Try to find a matching user by name
  const userResult = await pool.query(`
    SELECT * FROM users WHERE username = $1 OR email = $2
  `, [craftsman.name, `${craftsman.name.replace(/\s+/g, '.')}@extern.de`]);
  
  // If found, use that user; otherwise create a new one
  // ...
  
  // Update craftsman with user_id
  await pool.query(`
    UPDATE craftsmen SET user_id = $1 WHERE id = $2
  `, [userId, craftsman.id]);
}
```

### Next Steps
1. Create frontend pages for craftsmen management
2. Implement availability management UI for craftsmen
3. Enhance appointment scheduling to check craftsman availability
4. Add filtering and search functionality for craftsmen
5. Implement notifications for appointment confirmations
