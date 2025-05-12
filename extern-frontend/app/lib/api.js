import axios from 'axios';
import { quotesAPI as quotesAPIModule } from '../../lib/api/quotesAPI';
import { generateGermanInvoicePdf } from '../../lib/utils/pdfGenerator';

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
    // Extract craftsman_id from token
    let craftsmanId = null;
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const tokenData = JSON.parse(atob(token.split('.')[1]));
          craftsmanId = tokenData.craftsmanId;
        } catch (err) {
          console.error('Error parsing token:', err);
        }
      }
    }
    
    console.log(`Deleting customer ${id} for craftsman ${craftsmanId}`);
    const response = await api.delete(`/customers/${id}`, {
      params: { craftsman_id: craftsmanId }
    });
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
    try {
      console.log(`API call: Getting appointment with ID ${id}`);
      const response = await api.get(`/appointments/${id}`);
      console.log(`API response for appointment ${id}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching appointment ${id}:`, error);
      // Preserve the original error with its status code
      throw error;
    }
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
    // Extract craftsman_id from token
    let craftsmanId = null;
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const tokenData = JSON.parse(atob(token.split('.')[1]));
          craftsmanId = tokenData.craftsmanId;
        } catch (err) {
          console.error('Error parsing token:', err);
        }
      }
    }
    
    console.log(`Deleting appointment ${id} for craftsman ${craftsmanId}`);
    const response = await api.delete(`/appointments/${id}`, {
      params: { craftsman_id: craftsmanId }
    });
    return response.data;
  },
  approve: async (id) => {
    const response = await api.put(`/appointments/${id}/approve`);
    return response.data;
  },
  reject: async (id, reason) => {
    const response = await api.put(`/appointments/${id}/reject`, { reason });
    return response.data;
  },
  complete: async (id, data = {}) => {
    const response = await api.put(`/appointments/${id}/complete`, data);
    return response.data;
  }
};

// Invoices API calls
export const invoicesAPI = {
  getAll: async (filters = {}) => {
    console.log('invoicesAPI.getAll called with filters:', filters);
    const response = await api.get('/invoices', { params: filters });
    console.log('invoicesAPI.getAll response:', response.status);
    return response.data;
  },
  getById: async (id) => {
    // Get craftsman ID from token
    let craftsmanId = null;
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const tokenData = JSON.parse(atob(token.split('.')[1]));
          craftsmanId = tokenData.craftsmanId;
        } catch (err) {
          console.error('Error parsing token:', err);
        }
      }
    }
    
    const response = await api.get(`/invoices/${id}`, { 
      params: { craftsman_id: craftsmanId } 
    });
    return response.data;
  },
  create: async (invoiceData) => {
    // Get craftsman ID from token
    let craftsmanId = null;
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const tokenData = JSON.parse(atob(token.split('.')[1]));
          craftsmanId = tokenData.craftsmanId;
        } catch (err) {
          console.error('Error parsing token:', err);
        }
      }
    }
    
    const response = await api.post('/invoices', { ...invoiceData, craftsman_id: craftsmanId });
    return response.data;
  },
  delete: async (id) => {
    // Extract craftsman_id from token
    let craftsmanId = null;
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const tokenData = JSON.parse(atob(token.split('.')[1]));
          craftsmanId = tokenData.craftsmanId;
        } catch (err) {
          console.error('Error parsing token:', err);
        }
      }
    }
    
    // Make sure we have a craftsman ID
    if (!craftsmanId) {
      console.error('No craftsman ID found for delete request');
      throw new Error('Authentication error: No craftsman ID found');
    }
    
    console.log(`🗑️ DELETING INVOICE: id=${id}, craftsman_id=${craftsmanId}`);
    try {
      // Use the standard DELETE method with craftsman_id as a query parameter
      // Create the query parameters object
      const params = { craftsman_id: craftsmanId };
      console.log('DELETE query parameters:', params);
      
      // Make the delete request
      const response = await api.delete(`/invoices/${id}`, {
        params: params
      });
      
      console.log(`DELETE response status: ${response.status}`);
      console.log('DELETE response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      throw error;
    }
  },
  update: async (id, invoiceData) => {
    const response = await api.put(`/invoices/${id}`, invoiceData);
    return response.data;
  },
  
  // Generate PDF using our client-side German-style generator
  generatePdf: async (invoice, craftsmanData = {}) => {
    try {
      console.log('Using client-side German invoice PDF generator');
      
      // If we got an ID instead of a full invoice object, fetch the invoice first
      if (typeof invoice === 'string' || typeof invoice === 'number') {
        const craftsmanId = craftsmanData.craftsman_id || craftsmanData;
        console.log(`Fetching invoice ${invoice} for PDF generation`);
        invoice = await invoicesAPI.getById(invoice, craftsmanId);
      }
      
      // Calculate due date if not present (14 days is standard in Germany)
      if (!invoice.due_date) {
        const dueDateDate = new Date(invoice.created_at);
        dueDateDate.setDate(dueDateDate.getDate() + 14);
        invoice.due_date = dueDateDate.toISOString();
      }
      
      // Get craftsman data either from parameters or localStorage
      const finalCraftsmanData = {
        name: craftsmanData.name || localStorage.getItem('userName') || 'ZIMMR Craftsman',
        email: craftsmanData.email || localStorage.getItem('userEmail') || '',
        phone: craftsmanData.phone || localStorage.getItem('userPhone') || '',
        address: craftsmanData.address || localStorage.getItem('userAddress') || '',
        tax_id: craftsmanData.tax_id || localStorage.getItem('userTaxId') || '',
        iban: craftsmanData.iban || localStorage.getItem('userIban') || '',
        bic: craftsmanData.bic || localStorage.getItem('userBic') || '',
        bank_name: craftsmanData.bank_name || localStorage.getItem('userBank') || 'Bank',
        owner_name: craftsmanData.owner_name || localStorage.getItem('userName') || ''
      };
      
      // Generate the German-style PDF directly
      return await generateGermanInvoicePdf(invoice, finalCraftsmanData);
    } catch (error) {
      console.error('Error generating German invoice PDF:', error);
      throw error;
    }
  },
  
  // Legacy method to download PDF from server (for backward compatibility)
  downloadPdfFromServer: async (id, craftsmanId) => {
    try {
      console.log(`Requesting PDF download for invoice ${id} from server`);
      
      // Create a direct link to the PDF with authentication
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Use fetch instead of axios for better blob handling
      const response = await fetch(`/api/proxy/invoices/${id}/pdf?craftsman_id=${craftsmanId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        // Try to get error details if possible
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        } catch (jsonError) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Check if we got a valid PDF
      if (blob.size === 0) {
        throw new Error('Received empty PDF file');
      }
      
      // Log content type for debugging
      console.log(`Received PDF blob: type=${blob.type}, size=${blob.size} bytes`);
      
      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element to trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Error downloading PDF from server:', error);
      throw error;
    }
  },
  
  // Preview PDF (returns URL to view)
  previewPdf: async (id, craftsmanId) => {
    const response = await api.get(`/invoices/${id}/pdf-preview`, {
      params: { craftsman_id: craftsmanId }
    });
    return response.data;
  },
  
  // Convert quote to invoice
  convertQuoteToInvoice: async (id, craftsmanId) => {
    const response = await api.post(`/invoices/${id}/convert-to-invoice`, {
      craftsman_id: craftsmanId
    });
    return response.data;
  }
};

// Spaces API calls
export const spacesAPI = {
  getAll: async (filters = {}) => {
    const response = await api.get('/spaces', { params: filters });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/spaces/${id}`);
    return response.data;
  },
  create: async (spaceData) => {
    const response = await api.post('/spaces', spaceData);
    return response.data;
  },
  update: async (id, spaceData) => {
    const response = await api.put(`/spaces/${id}`, spaceData);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/spaces/${id}`);
    return response.data;
  }
};

// Materials API calls
export const materialsAPI = {
  getAll: async (filters = {}) => {
    const response = await api.get('/materials', { params: filters });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/materials/${id}`);
    return response.data;
  },
  create: async (materialData) => {
    const response = await api.post('/materials', materialData);
    return response.data;
  },
  update: async (id, materialData) => {
    const response = await api.put(`/materials/${id}`, materialData);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/materials/${id}`);
    return response.data;
  }
};

// Export quotesAPI
export const quotesAPI = quotesAPIModule;

// Export the api instance as default
export default api;
