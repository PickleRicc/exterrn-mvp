import { axiosInstance } from '../api';

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
      
      const response = await axiosInstance.get(url);
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
      
      const response = await axiosInstance.get(url);
      return response.data;
    } catch (error) {
      console.error(`Error fetching invoice ${id}:`, error);
      throw error;
    }
  },
  
  // Create new invoice
  create: async (invoiceData) => {
    try {
      const response = await axiosInstance.post('/invoices', invoiceData);
      return response.data;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  },
  
  // Update invoice
  update: async (id, invoiceData) => {
    try {
      const response = await axiosInstance.put(`/invoices/${id}`, invoiceData);
      return response.data;
    } catch (error) {
      console.error(`Error updating invoice ${id}:`, error);
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
      
      const response = await axiosInstance.delete(url);
      return response.data;
    } catch (error) {
      console.error(`Error deleting invoice ${id}:`, error);
      throw error;
    }
  },
  
  // Convert quote to invoice
  convertQuoteToInvoice: async (id, craftsman_id) => {
    try {
      const response = await axiosInstance.post(`/invoices/${id}/convert-to-invoice`, { craftsman_id });
      return response.data;
    } catch (error) {
      console.error(`Error converting quote to invoice:`, error);
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
      
      // This will trigger a file download
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
      
      const response = await axiosInstance.get(url);
      return response.data;
    } catch (error) {
      console.error(`Error previewing PDF:`, error);
      throw error;
    }
  }
};

export default invoicesAPI;
