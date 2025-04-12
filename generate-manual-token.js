const jwt = require('jsonwebtoken');
require('dotenv').config();

// Manual user details from the migration output
const tilesmanUser = {
  user_id: 20,
  email: 'tilesman@zimmr.de',
  role: 'craftsman',
  craftsman_id: 16,
  name: 'Max Müller',
  specialty: 'Tiling'
};

// Check for JWT_SECRET
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('JWT_SECRET is not defined in environment variables');
  process.exit(1);
}

// Generate a long-lived token for the tilesman
const token = jwt.sign(
  { 
    userId: tilesmanUser.user_id,
    email: tilesmanUser.email,
    role: tilesmanUser.role,
    craftsmanId: tilesmanUser.craftsman_id
  },
  jwtSecret,
  { expiresIn: '365d' } // Token valid for 1 year
);

console.log('\n=== TILESMAN TEST TOKEN ===');
console.log(token);
console.log('\nUse this token in Postman with the Authorization header:');
console.log('Authorization: Bearer <token>');
console.log('\nToken details:');
console.log('- User ID:', tilesmanUser.user_id);
console.log('- Email:', tilesmanUser.email);
console.log('- Role:', tilesmanUser.role);
console.log('- Craftsman ID:', tilesmanUser.craftsman_id);
console.log('- Name:', tilesmanUser.name);
console.log('- Specialty:', tilesmanUser.specialty);
console.log('- Expiry: 365 days from now');
