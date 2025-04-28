'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { invoicesAPI } from '../lib/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { generateInvoicePdf } from '../../lib/utils/pdfGenerator';
import { useRouter } from 'next/navigation';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [craftsmanId, setCraftsmanId] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [processingInvoiceId, setProcessingInvoiceId] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusUpdateId, setStatusUpdateId] = useState(null);

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
          // Ensure craftsman ID is stored as a string
          setCraftsmanId(String(extractedCraftsmanId));
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
      setError('You are not logged in. Please log in to view invoices.');
    }
  }, []);

  useEffect(() => {
    if (craftsmanId) {
      fetchInvoices();
    }
  }, [craftsmanId]);

  useEffect(() => {
    if (invoices.length > 0) {
      let filtered = [...invoices];
      
      // Filter by type (tab)
      if (activeTab !== 'all') {
        filtered = filtered.filter(invoice => invoice.type === activeTab);
      }
      
      // Filter by status
      if (statusFilter !== 'all') {
        filtered = filtered.filter(invoice => invoice.status === statusFilter);
      }
      
      // Filter by search term (customer name or invoice number)
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(invoice => 
          (invoice.customer_name && invoice.customer_name.toLowerCase().includes(term)) || 
          (invoice.invoice_number && invoice.invoice_number.toLowerCase().includes(term))
        );
      }
      
      setFilteredInvoices(filtered);
    } else {
      setFilteredInvoices([]);
    }
  }, [invoices, activeTab, statusFilter, searchTerm]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      console.log('Fetching invoices with craftsman_id:', craftsmanId);
      // Pass craftsman_id as an object parameter
      const data = await invoicesAPI.getAll({ craftsman_id: craftsmanId });
      console.log('Fetched invoices:', data);
      setInvoices(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Failed to load invoices. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Direct client-side PDF generation without server request
  const handleGeneratePdf = async (invoice) => {
    try {
      setPdfLoading(true);
      setProcessingInvoiceId(invoice.id);
      
      // Get craftsman data from localStorage if available
      const craftsmanData = {
        name: localStorage.getItem('userName') || 'ZIMMR Craftsman',
        email: localStorage.getItem('userEmail') || '',
        phone: '',
        address: ''
      };
      
      // Generate PDF directly using our client-side utility
      await generateInvoicePdf(invoice, craftsmanData);
      
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again later.');
    } finally {
      setPdfLoading(false);
      setProcessingInvoiceId(null);
    }
  };

  // Handle status update
  const handleStatusUpdate = async (invoiceId, newStatus) => {
    if (!craftsmanId || updatingStatus) return;
    
    try {
      setUpdatingStatus(true);
      setStatusUpdateId(invoiceId);
      
      // Call API to update invoice status
      await invoicesAPI.update(invoiceId, { 
        status: newStatus,
        craftsman_id: craftsmanId
      });
      
      // Update local state to reflect the change
      setInvoices(invoices.map(invoice => 
        invoice.id === invoiceId 
          ? { ...invoice, status: newStatus } 
          : invoice
      ));
      
    } catch (err) {
      console.error('Error updating invoice status:', err);
      alert('Failed to update invoice status. Please try again.');
    } finally {
      setUpdatingStatus(false);
      setStatusUpdateId(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-900/30 text-green-400';
      case 'overdue':
        return 'bg-red-900/30 text-red-400 animate-pulse';
      case 'pending':
        return 'bg-blue-900/30 text-blue-400';
      case 'cancelled':
        return 'bg-gray-900/30 text-gray-400';
      case 'draft':
        return 'bg-yellow-900/30 text-yellow-400';
      default:
        return 'bg-blue-900/30 text-blue-400';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Add event listener for focus to refresh data when returning to the page
  const handleFocus = () => {
    fetchInvoices();
  };

  useEffect(() => {
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Add event listener for visibility change to refresh data when tab becomes visible
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      fetchInvoices();
    }
  };

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#0a1929] text-white">
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Invoices & Quotes</h1>
            <div className="flex space-x-2">
              <Link
                href="/invoices/new"
                className="px-4 py-2 bg-[#e91e63] hover:bg-[#d81b60] text-white font-medium rounded-xl transition-colors"
              >
                New Invoice
              </Link>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-500/20 text-red-400 p-4 rounded-xl mb-6">
              {error}
            </div>
          )}
          
          {/* Filters and Search */}
          <div className="bg-[#132f4c] rounded-xl p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              {/* Tabs for document types */}
              <div className="flex bg-[#0a1929] rounded-lg p-1 flex-wrap">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'all' 
                      ? 'bg-[#e91e63] text-white' 
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab('invoice')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'invoice' 
                      ? 'bg-[#e91e63] text-white' 
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Invoices
                </button>
                <button
                  onClick={() => setActiveTab('quote')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'quote' 
                      ? 'bg-[#e91e63] text-white' 
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Quotes
                </button>
                <button
                  onClick={() => setActiveTab('draft')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'draft' 
                      ? 'bg-[#e91e63] text-white' 
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Drafts
                </button>
              </div>
              
              {/* Status filter */}
              <div className="flex-1">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-white/10 text-white border border-white/10 rounded-xl px-4 py-2 appearance-none focus:ring-2 focus:ring-[#e91e63]/50 focus:border-[#e91e63]/50"
                  style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
                >
                  <option value="all" className="text-black bg-white">All Statuses</option>
                  <option value="pending" className="text-black bg-white">Pending</option>
                  <option value="paid" className="text-black bg-white">Paid</option>
                  <option value="overdue" className="text-black bg-white">Overdue</option>
                  <option value="cancelled" className="text-black bg-white">Cancelled</option>
                </select>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by customer name or invoice number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/10 text-white border border-white/10 rounded-xl pl-10 pr-4 py-2 appearance-none focus:ring-2 focus:ring-[#e91e63]/50 focus:border-[#e91e63]/50"
                style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
              />
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#e91e63]"></div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="bg-[#132f4c] rounded-xl p-6 text-center">
              <p className="text-lg mb-4">No invoices found</p>
              <Link 
                href="/invoices/new" 
                className="px-4 py-2 bg-[#e91e63] hover:bg-[#d81b60] text-white font-medium rounded-xl transition-colors"
              >
                Create Your First Invoice
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInvoices.map((invoice) => (
                <div key={invoice.id} className="bg-[#132f4c] rounded-xl p-4 shadow-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h2 className="text-lg font-semibold">
                        Invoice #{invoice.invoice_number || invoice.id}
                      </h2>
                      <p className="text-sm text-gray-300">
                        {invoice.customer_name || 'Customer'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-xl text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}>
                      {invoice.status || 'pending'}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Amount:</span>
                      <span className="font-medium">€{parseFloat(invoice.total_amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Created:</span>
                      <span>{formatDate(invoice.created_at)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Due Date:</span>
                      <span>{formatDate(invoice.due_date)}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <Link 
                      href={`/invoices/${invoice.id}`}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                      View Details
                    </Link>
                    <div className="flex space-x-2">
                      <div className="relative">
                        <select
                          value={invoice.status || 'pending'}
                          onChange={(e) => handleStatusUpdate(invoice.id, e.target.value)}
                          disabled={updatingStatus && statusUpdateId === invoice.id}
                          className={`px-3 py-1 bg-white/10 text-white border border-white/10 rounded-xl appearance-none focus:ring-2 focus:ring-[#e91e63]/50 focus:border-[#e91e63]/50 ${updatingStatus && statusUpdateId === invoice.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
                        >
                          <option value="pending" className="text-black bg-white">Status: Pending</option>
                          <option value="paid" className="text-black bg-white">Status: Paid</option>
                          <option value="overdue" className="text-black bg-white">Status: Overdue</option>
                          <option value="cancelled" className="text-black bg-white">Status: Cancelled</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-white">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                          </svg>
                        </div>
                        {updatingStatus && statusUpdateId === invoice.id && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleGeneratePdf(invoice)}
                        disabled={pdfLoading && processingInvoiceId === invoice.id}
                        className={`px-3 py-1 ${pdfLoading && processingInvoiceId === invoice.id ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed' : 'bg-[#e91e63]/20 hover:bg-[#e91e63]/30 text-[#e91e63] cursor-pointer'} text-sm font-medium rounded-xl transition-colors flex items-center`}
                      >
                        {pdfLoading && processingInvoiceId === invoice.id ? (
                          <>
                            <span className="mr-2 h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                            Processing...
                          </>
                        ) : 'Download PDF'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}
