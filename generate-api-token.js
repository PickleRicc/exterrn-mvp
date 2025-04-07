const jwt = require('jsonwebtoken');
require('dotenv').config();

// Use the ID returned from the SQL query
const USER_ID = 13;

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('JWT_SECRET is not defined in environment variables');
  process.exit(1);
}

// Generate a long-lived token for n8n
const token = jwt.sign(
  { 
    userId: USER_ID,
    email: 'api@zimmr.internal',
    role: 'admin',
    // No craftsmanId associated - this allows creating customers for any craftsman
  },
  jwtSecret,
  { expiresIn: '365d' } // Token valid for 1 year
);

console.log('API Token for n8n:');
console.log(token);
console.log('\nUse this token in your n8n workflow with the Authorization header:');
console.log('Authorization: Bearer <token>');
