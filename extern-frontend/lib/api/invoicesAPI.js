import api from '../../app/lib/api';
import { generateInvoicePdf, generateSimpleInvoicePdf } from '../utils/pdfGenerator';

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
        // Handle both formats: direct value or object with craftsman_id property
        if (typeof craftsman_id === 'object' && craftsman_id.craftsman_id) {
          params.craftsman_id = craftsman_id.craftsman_id;
        } else {
          params.craftsman_id = craftsman_id;
        }
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
  
  // Update existing invoice
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
  }
};

export default invoicesAPI;
