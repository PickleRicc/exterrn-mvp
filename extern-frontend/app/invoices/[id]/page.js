'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { invoicesAPI, customersAPI } from '../../lib/api';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { generateInvoicePdf } from '../../../lib/utils/pdfGenerator';

export default function InvoiceDetailPage({ params }) {
  const [invoice, setInvoice] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [craftsmanId, setCraftsmanId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [formData, setFormData] = useState({
    craftsman_id: '',
    customer_id: '',
    amount: '',
    tax_amount: '',
    total_amount: '',
    notes: '',
    due_date: '',
    status: ''
  });
  
  const router = useRouter();
  const invoiceId = params.id;

  useEffect(() => {
    // Get craftsman ID from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        
        // Check for craftsmanId in different possible formats
        let extractedCraftsmanId = null;
        if (tokenData.craftsmanId) {
          extractedCraftsmanId = tokenData.craftsmanId;
        } else if (tokenData.craftsman_id) {
          extractedCraftsmanId = tokenData.craftsman_id;
        } else if (tokenData.user && tokenData.user.craftsmanId) {
          extractedCraftsmanId = tokenData.user.craftsmanId;
        } else if (tokenData.user && tokenData.user.craftsman_id) {
          extractedCraftsmanId = tokenData.user.craftsman_id;
        }
        
        if (extractedCraftsmanId) {
          setCraftsmanId(extractedCraftsmanId);
          setFormData(prev => ({ ...prev, craftsman_id: extractedCraftsmanId }));
        } else {
          setError('No craftsman ID found in your account. Please contact support.');
        }
      } catch (err) {
        console.error('Error parsing token:', err);
        setError('Error authenticating your account. Please try logging in again.');
      }
    } else {
      setError('You are not logged in. Please log in to view invoice details.');
    }
  }, []);

  useEffect(() => {
    if (craftsmanId && invoiceId) {
      fetchInvoice();
      fetchCustomers();
    }
  }, [craftsmanId, invoiceId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const data = await invoicesAPI.getById(invoiceId, { craftsman_id: craftsmanId });
      console.log('Fetched invoice:', data);
      setInvoice(data);
      
      // Initialize form data with invoice data
      setFormData({
        craftsman_id: data.craftsman_id,
        customer_id: data.customer_id,
        amount: data.amount,
        tax_amount: data.tax_amount || 0,
        total_amount: data.total_amount,
        notes: data.notes || '',
        due_date: data.due_date ? new Date(data.due_date).toISOString().split('T')[0] : '',
        status: data.status || 'pending'
      });
      
      setError(null);
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError('Failed to load invoice. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await customersAPI.getAll({ craftsman_id: craftsmanId });
      console.log('Fetched customers:', data);
      setCustomers(data);
    } catch (err) {
      console.error('Error fetching customers:', err);
      // Don't set error here to avoid overriding invoice fetch errors
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Auto-calculate total amount when amount or tax_amount changes
      if (name === 'amount' || name === 'tax_amount') {
        const amount = parseFloat(newData.amount) || 0;
        const taxAmount = parseFloat(newData.tax_amount) || 0;
        newData.total_amount = (amount + taxAmount).toFixed(2);
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.customer_id) {
      setError('Please select a customer');
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Prepare data for submission
      const invoiceData = {
        ...formData,
        amount: parseFloat(formData.amount),
        tax_amount: parseFloat(formData.tax_amount) || 0,
        total_amount: parseFloat(formData.total_amount)
      };
      
      console.log('Submitting invoice update:', invoiceData);
      
      const result = await invoicesAPI.update(invoiceId, invoiceData);
      console.log('Invoice updated:', result);
      
      setInvoice(result);
      setSuccess(true);
      setEditing(false);
      
      // Clear success message after delay
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
    } catch (err) {
      console.error('Error updating invoice:', err);
      setError(err.response?.data?.error || 'Failed to update invoice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGeneratePdf = async () => {
    try {
      setPdfLoading(true);
      
      // Get craftsman data from localStorage if available
      const craftsmanData = {
        name: localStorage.getItem('userName') || 'ZIMMR Craftsman',
        email: localStorage.getItem('userEmail') || '',
        phone: '',
        address: ''
      };
      
      // Generate PDF directly
      await generateInvoicePdf(invoice, craftsmanData);
      
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again later.');
    } finally {
      setPdfLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/20 text-green-400';
      case 'overdue':
        return 'bg-red-500/20 text-red-400';
      case 'pending':
      default:
        return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#0a1929] text-white">
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Link 
              href="/invoices" 
              className="text-[#e91e63] hover:text-[#d81b60] transition-colors"
            >
              &larr; Back to Invoices
            </Link>
            <h1 className="text-2xl font-bold mt-2">
              {editing ? 'Edit Invoice' : invoice ? `Invoice #${invoice.invoice_number || invoice.id}` : 'Invoice Details'}
            </h1>
          </div>
          
          {error && (
            <div className="bg-red-500/20 text-red-400 p-4 rounded-xl mb-6">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-500/20 text-green-400 p-4 rounded-xl mb-6">
              Invoice updated successfully!
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#e91e63]"></div>
            </div>
          ) : invoice ? (
            <>
              {editing ? (
                <div className="bg-[#132f4c] rounded-xl p-6 shadow-lg">
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Customer Selection */}
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium mb-1">
                          Customer *
                        </label>
                        <select
                          name="customer_id"
                          value={formData.customer_id}
                          onChange={handleChange}
                          className="w-full bg-[#1e3a5f] border border-[#2a4d76] rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                          required
                        >
                          <option value="">Select a customer</option>
                          {customers.map(customer => (
                            <option key={customer.id} value={customer.id}>
                              {customer.name} {customer.email ? `(${customer.email})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Amount */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Amount (€) *
                        </label>
                        <input
                          type="number"
                          name="amount"
                          value={formData.amount}
                          onChange={handleChange}
                          step="0.01"
                          min="0"
                          className="w-full bg-[#1e3a5f] border border-[#2a4d76] rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                          required
                        />
                      </div>
                      
                      {/* Tax Amount */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Tax Amount (€)
                        </label>
                        <input
                          type="number"
                          name="tax_amount"
                          value={formData.tax_amount}
                          onChange={handleChange}
                          step="0.01"
                          min="0"
                          className="w-full bg-[#1e3a5f] border border-[#2a4d76] rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                        />
                      </div>
                      
                      {/* Total Amount (calculated) */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Total Amount (€) *
                        </label>
                        <input
                          type="number"
                          name="total_amount"
                          value={formData.total_amount}
                          onChange={handleChange}
                          step="0.01"
                          min="0"
                          className="w-full bg-[#1e3a5f] border border-[#2a4d76] rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e91e63] bg-opacity-50"
                          required
                          readOnly
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Automatically calculated from amount + tax
                        </p>
                      </div>
                      
                      {/* Due Date */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Due Date
                        </label>
                        <input
                          type="date"
                          name="due_date"
                          value={formData.due_date}
                          onChange={handleChange}
                          className="w-full bg-[#1e3a5f] border border-[#2a4d76] rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                        />
                      </div>
                      
                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Status
                        </label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleChange}
                          className="w-full bg-[#1e3a5f] border border-[#2a4d76] rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </div>
                      
                      {/* Notes */}
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium mb-1">
                          Notes
                        </label>
                        <textarea
                          name="notes"
                          value={formData.notes}
                          onChange={handleChange}
                          rows="4"
                          className="w-full bg-[#1e3a5f] border border-[#2a4d76] rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                        ></textarea>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors mr-3"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className={`px-4 py-2 bg-[#e91e63] hover:bg-[#d81b60] text-white font-medium rounded-xl transition-colors ${
                          submitting ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                      >
                        {submitting ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-[#132f4c] rounded-xl p-6 shadow-lg">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xl font-semibold mb-1">
                        Invoice #{invoice.invoice_number || invoice.id}
                      </h2>
                      <span className={`px-2 py-1 rounded-xl text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}>
                        {invoice.status || 'pending'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditing(true)}
                        className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-xl transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={handleGeneratePdf}
                        disabled={pdfLoading}
                        className={`px-3 py-1 ${pdfLoading ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed' : 'bg-[#e91e63]/20 hover:bg-[#e91e63]/30 text-[#e91e63] cursor-pointer'} text-sm font-medium rounded-xl transition-colors flex items-center`}
                      >
                        {pdfLoading ? (
                          <>
                            <span className="mr-2 h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                            Processing...
                          </>
                        ) : 'Download PDF'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="text-lg font-medium mb-3">Customer Information</h3>
                      <div className="bg-[#1e3a5f] rounded-xl p-4">
                        <p className="font-medium">{invoice.customer_name || 'N/A'}</p>
                        {invoice.customer_email && <p className="text-gray-300">{invoice.customer_email}</p>}
                        {invoice.customer_phone && <p className="text-gray-300">{invoice.customer_phone}</p>}
                        {invoice.customer_address && <p className="text-gray-300">{invoice.customer_address}</p>}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-3">Invoice Details</h3>
                      <div className="bg-[#1e3a5f] rounded-xl p-4">
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-300">Created:</span>
                          <span>{formatDate(invoice.created_at)}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-300">Due Date:</span>
                          <span>{formatDate(invoice.due_date)}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-300">Amount:</span>
                          <span>€{parseFloat(invoice.amount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-300">Tax:</span>
                          <span>€{parseFloat(invoice.tax_amount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Total:</span>
                          <span>€{parseFloat(invoice.total_amount).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {invoice.notes && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-3">Notes</h3>
                      <div className="bg-[#1e3a5f] rounded-xl p-4">
                        <p className="whitespace-pre-wrap">{invoice.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-[#132f4c] rounded-xl p-6 text-center">
              <p className="text-lg mb-4">Invoice not found</p>
              <Link 
                href="/invoices" 
                className="px-4 py-2 bg-[#e91e63] hover:bg-[#d81b60] text-white font-medium rounded-xl transition-colors"
              >
                View All Invoices
              </Link>
            </div>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}
