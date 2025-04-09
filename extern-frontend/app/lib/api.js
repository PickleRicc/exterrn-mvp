import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  // Use relative URL to the Next.js API proxy to avoid mixed content issues
  baseURL: '/api/proxy',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// NOTE: This uses a Next.js API route as a proxy to avoid mixed content errors
// when the frontend is served over HTTPS (as it is on Vercel) and the backend is HTTP

// Add a request interceptor to attach the JWT token to every request
api.interceptors.request.use(
  (config) => {
    // Only run on the client side
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        // Add a debug log to help diagnose token issues
        console.debug('Request with auth header:', config.url);
        
        // For debugging token issues
        try {
          const tokenData = JSON.parse(atob(token.split('.')[1]));
          console.debug('Token data for request:', {
            userId: tokenData.userId,
            role: tokenData.role,
            craftsmanId: tokenData.craftsmanId
          });
        } catch (err) {
          console.error('Error parsing token for debug:', err);
        }
      } else {
        console.debug('No token found for request:', config.url);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized errors (token expired or invalid)
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      // Only run on the client side
      if (typeof window !== 'undefined') {
        console.error('Authentication error (401):', error.config.url);
        
        // Check if we have a refresh token (for future implementation)
        // For now, we'll just redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login page
        window.location.href = '/auth/login';
      }
    }
    
    // Handle 403 Forbidden errors (insufficient permissions)
    if (error.response && error.response.status === 403) {
      console.error('Permission error (403):', error.config.url, error.response.data);
      
      // If we get multiple 403 errors, it might be due to token issues
      // Check if the token is still valid by decoding it
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const tokenData = JSON.parse(atob(token.split('.')[1]));
            const expiryTime = tokenData.exp * 1000; // Convert to milliseconds
            const currentTime = Date.now();
            
            console.debug('Token expiry check:', {
              expiryTime: new Date(expiryTime).toISOString(),
              currentTime: new Date(currentTime).toISOString(),
              timeRemaining: Math.floor((expiryTime - currentTime) / 1000 / 60) + ' minutes'
            });
            
            // If token is expired or about to expire (less than 5 minutes left)
            if (expiryTime - currentTime < 5 * 60 * 1000) {
              console.warn('Token is expired or about to expire, redirecting to login');
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/auth/login';
              return Promise.reject(error);
            }
          } catch (err) {
            console.error('Error checking token expiry:', err);
          }
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (username, email, password, role, phone, specialty, name) => {
    const response = await api.post('/auth/register', { 
      username, 
      email, 
      password,
      role,
      phone,
      specialty,
      name
    });
    return response.data;
  },
};

// Craftsmen API calls
export const craftsmenAPI = {
  getAll: async (filters = {}) => {
    const response = await api.get('/craftsmen', { params: filters });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/craftsmen/${id}`);
    return response.data;
  },
  update: async (id, craftsmanData) => {
    const response = await api.put(`/craftsmen/${id}`, craftsmanData);
    return response.data;
  },
  getAppointments: async (id) => {
    const response = await api.get(`/craftsmen/${id}/appointments`);
    return response.data;
  },
  checkAvailability: async (id, date, time) => {
    const response = await api.get(`/craftsmen/${id}/availability`, {
      params: { date, time }
    });
    return response.data;
  },
  checkAvailabilityWithAlternatives: async (id, requestedDateTime, options = {}) => {
    const response = await api.get(`/craftsmen/${id}/availability-check`, {
      params: { 
        requestedDateTime,
        daysToCheck: options.daysToCheck,
        slotsToReturn: options.slotsToReturn
      }
    });
    return response.data;
  }
};

// Customers API calls
export const customersAPI = {
  getAll: async (filters = {}) => {
    const response = await api.get('/customers', { params: filters });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },
  create: async (customerData) => {
    const response = await api.post('/customers', customerData);
    return response.data;
  },
  update: async (id, customerData) => {
    const response = await api.put(`/customers/${id}`, customerData);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/customers/${id}`);
    return response.data;
  },
  getAppointments: async (id) => {
    const response = await api.get(`/customers/${id}/appointments`);
    return response.data;
  },
};

// Appointments API calls
export const appointmentsAPI = {
  getAll: async (filters = {}) => {
    const response = await api.get('/appointments', { params: filters });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/appointments/${id}`);
    return response.data;
  },
  create: async (appointmentData) => {
    const response = await api.post('/appointments', appointmentData);
    return response.data;
  },
  update: async (id, appointmentData) => {
    const response = await api.put(`/appointments/${id}`, appointmentData);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/appointments/${id}`);
    return response.data;
  },
  approve: async (id) => {
    const response = await api.put(`/appointments/${id}/approve`);
    return response.data;
  },
  reject: async (id, reason) => {
    const response = await api.put(`/appointments/${id}/reject`, { reason });
    return response.data;
  }
};

export default api;
