import api from '../../app/lib/api';

export const invoicesAPI = {
  // Get all invoices with optional filters
  getAll: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.craftsman_id) {
        queryParams.append('craftsman_id', filters.craftsman_id);
      }
      
      if (filters.customer_id) {
        queryParams.append('customer_id', filters.customer_id);
      }
      
      if (filters.status) {
        queryParams.append('status', filters.status);
      }
      
      // Add support for type filter (invoice/quote)
      if (filters.type) {
        queryParams.append('type', filters.type);
      }
      
      // Add support for search
      if (filters.search) {
        queryParams.append('search', filters.search);
      }
      
      // Add support for date range filtering
      if (filters.from_date) {
        queryParams.append('from_date', filters.from_date);
      }
      
      if (filters.to_date) {
        queryParams.append('to_date', filters.to_date);
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
  
  // Update invoice
  update: async (id, invoiceData) => {
    try {
      console.log(`Updating invoice ${id} with data:`, JSON.stringify(invoiceData, null, 2));
      const response = await api.put(`/invoices/${id}`, invoiceData);
      console.log('Invoice updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error updating invoice ${id}:`, error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  },
  
  // Delete invoice
  delete: async (id, craftsman_id) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (craftsman_id) {
        queryParams.append('craftsman_id', craftsman_id);
      }
      
      const queryString = queryParams.toString();
      const url = `/invoices/${id}${queryString ? `?${queryString}` : ''}`;
      
      console.log(`Deleting invoice with URL: ${url}`);
      const response = await api.delete(url);
      return response.data;
    } catch (error) {
      console.error(`Error deleting invoice ${id}:`, error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  },
  
  // Convert quote to invoice
  convertQuoteToInvoice: async (id, craftsman_id) => {
    try {
      console.log(`Converting quote ${id} to invoice`);
      const response = await api.post(`/invoices/${id}/convert-to-invoice`, { craftsman_id });
      console.log('Quote converted successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error converting quote to invoice:`, error);
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
      const queryParams = new URLSearchParams();
      
      if (craftsman_id) {
        queryParams.append('craftsman_id', craftsman_id);
      }
      
      const queryString = queryParams.toString();
      const url = `/invoices/${id}/pdf${queryString ? `?${queryString}` : ''}`;
      
      console.log(`Generating PDF with URL: ${url}`);
      
      // Instead of using window.open which doesn't provide error feedback,
      // use fetch to check if the PDF generation is successful first
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      // If successful, open in a new tab
      window.open(url, '_blank');
      return true;
    } catch (error) {
      console.error(`Error generating PDF:`, error);
      throw error;
    }
  },
  
  // Preview PDF for invoice
  previewPdf: async (id, craftsman_id) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (craftsman_id) {
        queryParams.append('craftsman_id', craftsman_id);
      }
      
      const queryString = queryParams.toString();
      const url = `/invoices/${id}/pdf-preview${queryString ? `?${queryString}` : ''}`;
      
      console.log(`Requesting PDF preview with URL: ${url}`);
      const response = await api.get(url);
      
      // Validate the response
      if (!response.data || !response.data.url) {
        console.error('Invalid PDF preview response:', response.data);
        throw new Error('Invalid PDF preview response');
      }
      
      console.log('PDF preview response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error previewing PDF:`, error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  }
};

export default invoicesAPI;
