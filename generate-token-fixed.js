const jwt = require('jsonwebtoken');

// Use a hardcoded secret that matches the server
// This is only for development/testing purposes
const jwtSecret = 'superultrasecret123';

// Use the ID of our tilesman user
const USER_ID = 20;

// Generate a long-lived token for the tilesman
const token = jwt.sign(
  { 
    userId: USER_ID,
    email: 'tilesman@zimmr.de',
    role: 'craftsman',
    craftsmanId: 16  // Include the craftsman ID for proper authorization
  },
  jwtSecret,
  { expiresIn: '365d' } // Token valid for 1 year
);

console.log('API Token for Tilesman:');
console.log(token);
console.log('\nUse this token in Postman with the Authorization header:');
console.log('Authorization: Bearer <token>');

// Also generate an admin token for comparison
const adminToken = jwt.sign(
  { 
    userId: 13,
    email: 'api@zimmr.internal',
    role: 'admin'
  },
  jwtSecret,
  { expiresIn: '365d' } // Token valid for 1 year
);

console.log('\n\nAdmin API Token (for comparison):');
console.log(adminToken);
console.log('\nUse this token for admin operations:');
console.log('Authorization: Bearer <token>');
