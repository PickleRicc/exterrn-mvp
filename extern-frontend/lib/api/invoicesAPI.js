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
  getById: async (id) => {
    try {
      const response = await axiosInstance.get(`/invoices/${id}`);
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
  delete: async (id) => {
    try {
      const response = await axiosInstance.delete(`/invoices/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting invoice ${id}:`, error);
      throw error;
    }
  }
};

export default invoicesAPI;
