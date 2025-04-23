import api from '../../app/lib/api';

export const invoicesAPI = {
  // Get all invoices with optional filters
  getAll: async (filters = {}) => {
    try {
      // Convert filters to proper params object
      const params = {};
      
      if (typeof filters === 'object') {
        // If filters is an object, use it directly
        Object.assign(params, filters);
      } else if (filters) {
        // If filters is just the craftsman_id (for backward compatibility)
        params.craftsman_id = filters;
      }
      
      console.log('Fetching invoices with params:', params);
      const response = await api.get('/invoices', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  },
  
  // Get invoice by ID
  getById: async (id, craftsman_id) => {
    try {
      // Create params object
      const params = {};
      
      if (craftsman_id) {
        params.craftsman_id = craftsman_id;
      }
      
      console.log('Fetching invoice with ID:', id, 'and params:', params);
      const response = await api.get(`/invoices/${id}`, { params });
      return response.data;
    } catch (error) {
      console.error(`Error fetching invoice ${id}:`, error);
      throw error;
    }
  },
  
  // Create new invoice
  create: async (invoiceData) => {
    try {
      console.log('Creating invoice with data:', JSON.stringify(invoiceData, null, 2));
      const response = await api.post('/invoices', invoiceData);
      console.log('Invoice created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating invoice:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  },
  
  // Generate PDF for invoice
  generatePdf: async (id, params = {}) => {
    try {
      // Extract craftsman_id from params if it's an object, or use params directly if it's a primitive value
      let craftsman_id;
      if (typeof params === 'object' && params !== null) {
        craftsman_id = params.craftsman_id;
        console.log(`Generating PDF for invoice ${id} with params:`, params);
      } else {
        // For backward compatibility
        craftsman_id = params;
        console.log(`Generating PDF for invoice ${id} with craftsman ID ${craftsman_id}`);
      }
      
      // Get the authentication token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Simple direct approach - open the PDF URL in a new tab
      // The Next.js API routes will handle the proxy and authentication
      const url = `/api/invoices/${id}/pdf?craftsman_id=${craftsman_id}`;
      console.log('Opening PDF URL:', url);
      
      // Open in a new tab
      window.open(url, '_blank');
      
      return true;
    } catch (error) {
      console.error(`Error generating PDF:`, error);
      throw error;
    }
  }
};

export default invoicesAPI;
