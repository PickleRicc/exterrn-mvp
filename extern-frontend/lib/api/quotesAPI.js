/**
 * Quote API layer for ZIMMR application
 * 
 * This provides a dedicated API for working with quotes, separating them from invoices
 * while leveraging the existing backend infrastructure.
 */

import api from '../../app/lib/api';
import { generateGermanQuotePdf } from '../utils/pdfGenerator';

export const quotesAPI = {
  /**
   * Get all quotes with optional filters
   * @param {Object} filters - Optional filters like craftsman_id
   * @returns {Promise<Array>} List of quotes
   */
  getAll: async (filters = {}) => {
    try {
      // Add type=quote to the filters to only get quotes
      const quoteFilters = { ...filters, type: 'quote' };
      
      console.log('Fetching quotes with params:', quoteFilters);
      const response = await api.get('/invoices', { params: quoteFilters });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching quotes:', error);
      throw error;
    }
  },
  
  /**
   * Get quote by ID
   * @param {string|number} id - Quote ID
   * @param {string|number} craftsman_id - Craftsman ID
   * @returns {Promise<Object>} Quote details
   */
  getById: async (id, craftsman_id) => {
    try {
      console.log(`Fetching quote ${id} for craftsman ${craftsman_id}`);
      
      // Create params object
      const params = { craftsman_id };
      
      const response = await api.get(`/invoices/${id}`, { params });
      const quote = response.data;
      
      // Verify this is actually a quote
      if (quote.type !== 'quote') {
        console.warn(`Document ${id} is not a quote, it's a ${quote.type}`);
      }
      
      return quote;
    } catch (error) {
      console.error(`Error fetching quote ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Create a new quote
   * @param {Object} quoteData - Quote data
   * @returns {Promise<Object>} Created quote
   */
  create: async (quoteData) => {
    try {
      // Always ensure type is set to 'quote'
      const formattedQuoteData = {
        ...quoteData,
        type: 'quote'
      };
      
      console.log('Creating quote with data:', formattedQuoteData);
      const response = await api.post('/invoices', formattedQuoteData);
      
      console.log('Quote created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating quote:', error);
      throw error;
    }
  },
  
  /**
   * Update an existing quote
   * @param {string|number} id - Quote ID
   * @param {Object} quoteData - Updated quote data
   * @returns {Promise<Object>} Updated quote
   */
  update: async (id, quoteData) => {
    try {
      // Always ensure type remains 'quote' during updates
      const formattedQuoteData = {
        ...quoteData,
        type: 'quote'
      };
      
      console.log(`Updating quote ${id} with data:`, formattedQuoteData);
      const response = await api.put(`/invoices/${id}`, formattedQuoteData);
      
      console.log('Quote updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error updating quote ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Update the status of a quote
   * @param {string|number} id - Quote ID
   * @param {string} status - New status (pending, approved, rejected, etc)
   * @returns {Promise<Object>} Updated quote
   */
  updateStatus: async (id, status) => {
    try {
      console.log(`Updating quote ${id} status to ${status}`);
      const response = await api.put(`/invoices/${id}/status`, { status });
      
      console.log('Quote status updated successfully');
      return response.data;
    } catch (error) {
      console.error(`Error updating quote ${id} status:`, error);
      throw error;
    }
  },
  
  /**
   * Delete a quote
   * @param {string|number} id - Quote ID
   * @param {string|number} craftsman_id - Craftsman ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  delete: async (id, craftsman_id) => {
    try {
      console.log(`Deleting quote ${id} for craftsman ${craftsman_id}`);
      
      // First verify this is actually a quote
      const quote = await quotesAPI.getById(id, craftsman_id);
      if (quote.type !== 'quote') {
        throw new Error(`Cannot delete: Document ${id} is not a quote, it's a ${quote.type}`);
      }
      
      const response = await api.delete(`/invoices/${id}`, { 
        params: { craftsman_id } 
      });
      
      console.log('Quote deleted successfully');
      return response.data;
    } catch (error) {
      console.error(`Error deleting quote ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Convert a quote to an invoice
   * @param {string|number} quoteId - Quote ID to convert
   * @param {string|number} craftsman_id - Craftsman ID
   * @returns {Promise<Object>} Newly created invoice
   */
  convertToInvoice: async (quoteId, craftsman_id) => {
    try {
      console.log(`Converting quote ${quoteId} to invoice`);
      
      // 1. Fetch the quote to be converted
      const quote = await quotesAPI.getById(quoteId, craftsman_id);
      
      // 2. Prepare the invoice data (copy from quote but change type)
      const invoiceData = {
        ...quote,
        type: 'invoice',
        status: 'pending', // Reset status for new invoice
        original_quote_id: quoteId, // Reference to original quote
        created_at: new Date().toISOString() // New creation date
      };
      
      // 3. Remove properties that shouldn't be duplicated
      delete invoiceData.id;
      
      // 4. Create the new invoice using the regular invoice creation endpoint
      const response = await api.post('/invoices', invoiceData);
      const newInvoice = response.data;
      
      console.log('New invoice created from quote:', newInvoice);
      
      // 5. Optionally, mark the original quote as converted or delete it
      await quotesAPI.updateStatus(quoteId, 'converted');
      
      return { 
        success: true, 
        message: 'Quote converted to invoice successfully',
        newInvoice 
      };
    } catch (error) {
      console.error(`Error converting quote ${quoteId} to invoice:`, error);
      throw error;
    }
  },
  
  /**
   * Generate a PDF for a quote in German format
   * @param {Object} quote - Quote data
   * @param {Object} craftsmanData - Craftsman data
   * @returns {Promise<boolean>} Success indicator
   */
  generatePdf: async (quote, craftsmanData = {}) => {
    try {
      console.log('Generating German format quote PDF for quote:', quote.id);
      
      // Add validity period if not present (30 days is standard in Germany)
      const validUntilDate = new Date(quote.created_at);
      validUntilDate.setDate(validUntilDate.getDate() + 30);
      
      // Format the quote number properly (change INV prefix to ANG)
      let quoteNumber = quote.invoice_number || quote.id;
      if (quoteNumber && quoteNumber.startsWith('INV-')) {
        quoteNumber = 'ANG-' + quoteNumber.substring(4);
      }
      
      const modifiedQuote = {
        ...quote,
        invoice_number: quoteNumber,
        valid_until: quote.valid_until || validUntilDate.toISOString()
      };
      
      console.log('Modified quote number:', quoteNumber);
      
      return await generateGermanQuotePdf(modifiedQuote, craftsmanData);
    } catch (error) {
      console.error('Error generating German quote PDF:', error);
      throw error;
    }
  }
};

export default quotesAPI;