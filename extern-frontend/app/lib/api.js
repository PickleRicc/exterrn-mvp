import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the JWT token to every request
api.interceptors.request.use(
  (config) => {
    // Only run on the client side
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
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
  (error) => {
    // Handle 401 Unauthorized errors (token expired or invalid)
    if (error.response && error.response.status === 401) {
      // Only run on the client side
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        // Redirect to login page
        window.location.href = '/auth/login';
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
  register: async (username, email, password) => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },
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
};

export default api;
