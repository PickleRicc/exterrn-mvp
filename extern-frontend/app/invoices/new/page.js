'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { invoicesAPI, customersAPI } from '../../lib/api';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function NewInvoicePage() {
  const [formData, setFormData] = useState({
    craftsman_id: '',
    customer_id: '',
    amount: '',
    tax_amount: '0',
    total_amount: '',
    notes: '',
    due_date: ''
  });
  
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Get craftsman ID from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        console.log('Token data:', tokenData);
        
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
        
        console.log('Extracted craftsman ID:', extractedCraftsmanId);
        
        if (extractedCraftsmanId) {
          setFormData(prev => ({ ...prev, craftsman_id: extractedCraftsmanId }));
          fetchCustomers(extractedCraftsmanId);
        } else {
          console.error('No craftsman ID found in token:', tokenData);
          setError('No craftsman ID found in your account. Please contact support.');
        }
      } catch (err) {
        console.error('Error parsing token:', err);
        setError('Error authenticating your account. Please try logging in again.');
      }
    } else {
      console.error('No token found in localStorage');
      setError('You are not logged in. Please log in to create invoices.');
    }
  }, []);

  const fetchCustomers = async (craftsmanId) => {
    try {
      setLoading(true);
      console.log('Fetching customers for craftsman ID:', craftsmanId);
      const data = await customersAPI.getAll({ craftsman_id: craftsmanId });
      console.log('Fetched customers:', data);
      setCustomers(data);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers. Please try again later.');
    } finally {
      setLoading(false);
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
      
      console.log('Submitting invoice data:', invoiceData);
      
      const result = await invoicesAPI.create(invoiceData);
      console.log('Invoice created:', result);
      
      setSuccess(true);
      
      // Redirect to invoice list after short delay
      setTimeout(() => {
        router.push('/invoices');
      }, 1500);
      
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError(err.response?.data?.error || 'Failed to create invoice. Please try again.');
    } finally {
      setSubmitting(false);
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
            <h1 className="text-2xl font-bold mt-2">Create New Invoice</h1>
          </div>
          
          {error && (
            <div className="bg-red-500/20 text-red-400 p-4 rounded-xl mb-6">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-500/20 text-green-400 p-4 rounded-xl mb-6">
              Invoice created successfully! Redirecting...
            </div>
          )}
          
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
                <Link 
                  href="/invoices" 
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors mr-3"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={submitting || success}
                  className={`px-4 py-2 bg-[#e91e63] hover:bg-[#d81b60] text-white font-medium rounded-xl transition-colors ${
                    (submitting || success) ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {submitting ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
