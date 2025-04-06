const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  // Check if JWT_SECRET is available
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('JWT_SECRET is not defined in environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  
  try {
    // Verify the token
    const decoded = jwt.verify(token, jwtSecret);
    
    console.log('Token decoded successfully:', JSON.stringify({
      userId: decoded.userId,
      role: decoded.role,
      craftsmanId: decoded.craftsmanId
    }));
    
    // Add the user info to the request - ensure we include both id and userId for backward compatibility
    req.user = {
      id: decoded.userId,
      userId: decoded.userId, // Include both formats for backward compatibility
      role: decoded.role,
      craftsmanId: decoded.craftsmanId,
      email: decoded.email
    };
    
    console.log('User object set in request:', JSON.stringify(req.user));
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(403).json({ error: 'Invalid token' });
  }
};

module.exports = {
  authenticateToken
};
