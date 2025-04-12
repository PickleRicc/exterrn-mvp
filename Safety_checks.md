# ZIMMR Platform - Production Security Checklist

## Backend Security Concerns

1. **Hardcoded IP Address**
   - The API proxy has a hardcoded backend URL (`http://3.127.139.32:3000`)
   - This should be moved to an environment variable in production

2. **JWT Implementation Issues**
   - Debug logging of JWT tokens in the frontend API interceptors exposes sensitive information
   - Console logs in authentication middleware should be removed in production
   - JWT expiry time should be configurable via environment variables

3. **Database Security**
   - No input sanitization for SQL queries in some controllers
   - Missing prepared statements in some database operations

4. **Error Handling**
   - Detailed error messages are being returned to clients, potentially exposing implementation details
   - Error stack traces are logged to console in production

5. **Test Endpoints**
   - Several test endpoints (`/test-email`, `/test-craftsmen`, `/db-test`) should be disabled in production

## Frontend Security Concerns

1. **Token Management**
   - JWT tokens stored in localStorage are vulnerable to XSS attacks
   - Consider using HttpOnly cookies instead

2. **Debug Logging**
   - Extensive debug logging of authentication data should be removed in production
   - Token parsing and expiry checking in the console exposes sensitive information

3. **API Proxy Implementation**
   - Error handling in the API proxy is minimal
   - Status codes from the backend are not properly forwarded to the client

## Production Readiness Issues

1. **Environment Configuration**
   - `.env` file is checked into version control (only 45 bytes, but still a concern)
   - `extern.pem` private key file is in the repository
   - Missing proper environment variable validation

2. **Rate Limiting**
   - No rate limiting on authentication endpoints
   - Missing protection against brute force attacks

3. **CORS Configuration**
   - CORS is configured with multiple origins including localhost
   - Should be restricted to production domains only in production

4. **Logging**
   - No structured logging for production monitoring
   - Missing request/response logging for security auditing

5. **Health Checks**
   - No health check endpoint for container orchestration
   - Missing monitoring endpoints for uptime checks

## Recommended Changes

### Backend Changes

1. **Security Hardening**
   ```javascript
   // Remove debug logging from auth middleware
   const authenticateToken = (req, res, next) => {
     // Get the token from the Authorization header
     const authHeader = req.headers['authorization'];
     const token = authHeader && authHeader.split(' ')[1];
     
     if (!token) {
       return res.status(401).json({ error: 'Access denied' });
     }
     
     try {
       const decoded = jwt.verify(token, process.env.JWT_SECRET);
       req.user = {
         id: decoded.userId,
         userId: decoded.userId,
         role: decoded.role,
         craftsmanId: decoded.craftsmanId,
         email: decoded.email
       };
       next();
     } catch (error) {
       res.status(403).json({ error: 'Invalid token' });
     }
   };
   ```

2. **Environment Configuration**
   - Create a proper `.env.production` file with secure settings
   - Add environment variable validation at startup
   - Remove test endpoints in production

3. **Add Rate Limiting**
   ```javascript
   // Add to index.js
   const rateLimit = require('express-rate-limit');
   
   // Apply rate limiting to auth routes
   const authLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 5, // 5 requests per window
     standardHeaders: true,
     legacyHeaders: false,
   });
   
   app.use('/auth', authLimiter, authRoutes);
   ```

4. **Production CORS Settings**
   ```javascript
   // Update CORS in index.js
   app.use(cors({
     origin: process.env.NODE_ENV === 'production' 
       ? [process.env.FRONTEND_URL] 
       : ['http://localhost:3000', process.env.FRONTEND_URL],
     methods: ['GET', 'POST', 'PUT', 'DELETE'],
     allowedHeaders: ['Content-Type', 'Authorization'],
     credentials: true
   }));
   ```

5. **Add Health Check Endpoint**
   ```javascript
   // Add to index.js
   app.get('/health', (req, res) => {
     res.status(200).json({ status: 'ok' });
   });
   ```

### Frontend Changes

1. **Remove Debug Logging**
   - Remove all console.debug and console.log statements from production code
   - Implement proper error boundaries for React components

2. **Improve API Proxy Error Handling**
   ```javascript
   // Update API proxy error handling
   export async function GET(request, { params }) {
     try {
       const path = params.path.join('/');
       const searchParams = request.nextUrl.searchParams;
       const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
       
       const backendUrl = process.env.BACKEND_URL || 'http://3.127.139.32:3000';
       const response = await fetch(`${backendUrl}/${path}${queryString}`, {
         headers: {
           'Content-Type': 'application/json',
           ...(request.headers.get('authorization') 
               ? { 'Authorization': request.headers.get('authorization') } 
               : {})
         },
         cache: 'no-store'
       });
       
       // Forward the status code from the backend
       if (!response.ok) {
         return NextResponse.json(
           await response.json(), 
           { status: response.status }
         );
       }
       
       const data = await response.json();
       return NextResponse.json(data);
     } catch (error) {
       return NextResponse.json(
         { error: 'Internal server error' }, 
         { status: 500 }
       );
     }
   }
   ```

3. **Consider Using HttpOnly Cookies**
   - Implement a more secure token storage mechanism
   - If using cookies, ensure proper CSRF protection

## Deployment Checklist

1. **Environment Variables**
   - Ensure all sensitive configuration is in environment variables
   - Use different JWT secrets for different environments
   - Set proper NODE_ENV value for production

2. **Security Headers**
   - Add security headers (Content-Security-Policy, X-XSS-Protection, etc.)
   - Enable HTTPS redirection

3. **Database**
   - Ensure database connection pooling is properly configured
   - Set up database backups and monitoring

4. **Logging and Monitoring**
   - Implement structured logging
   - Set up error tracking and performance monitoring

5. **CI/CD**
   - Add security scanning to CI/CD pipeline
   - Implement automated testing before deployment
