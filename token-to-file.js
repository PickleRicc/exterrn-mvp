const jwt = require('jsonwebtoken');
const fs = require('fs');

// Use a hardcoded secret that matches the server
const jwtSecret = 'superultrasecret123';

// Use the ID of our tilesman user
const USER_ID = 20;

// Generate a long-lived token for the tilesman
const token = jwt.sign(
  { 
    userId: USER_ID,
    email: 'tilesman@zimmr.de',
    role: 'craftsman',
    craftsmanId: 16
  },
  jwtSecret,
  { expiresIn: '365d' }
);

// Write token to file
fs.writeFileSync('tilesman-token.txt', token);

console.log('Token has been written to tilesman-token.txt');
