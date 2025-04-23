import api from '../../app/lib/api';

export const invoicesAPI = {
  // Get all invoices with optional filters
  getAll: async (craftsman_id) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (craftsman_id) {
        queryParams.append('craftsman_id', craftsman_id);
      }
      
      const queryString = queryParams.toString();
      const url = `/invoices${queryString ? `?${queryString}` : ''}`;
      
      console.log('Fetching invoices with URL:', url);
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  },
  
  // Get invoice by ID
  getById: async (id, craftsman_id) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (craftsman_id) {
        queryParams.append('craftsman_id', craftsman_id);
      }
      
      const queryString = queryParams.toString();
      const url = `/invoices/${id}${queryString ? `?${queryString}` : ''}`;
      
      console.log('Fetching invoice with URL:', url);
      const response = await api.get(url);
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
  generatePdf: async (id, craftsman_id) => {
    try {
      console.log(`Generating PDF for invoice ${id} with craftsman ID ${craftsman_id}`);
      
      // Get the authentication token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // For PDF download, we'll open a new tab with the PDF URL
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE || '';
      const url = `${baseUrl}/api/invoices/${id}/pdf?craftsman_id=${craftsman_id}`;
      window.open(url, '_blank');
      
      return true;
    } catch (error) {
      console.error(`Error generating PDF:`, error);
      throw error;
    }
  }
};

export default invoicesAPI;
