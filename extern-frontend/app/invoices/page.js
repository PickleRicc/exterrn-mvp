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
  const [lastRefresh, setLastRefresh] = useState(Date.now());

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
          setCraftsmanId(extractedCraftsmanId);
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
  }, [craftsmanId, lastRefresh]);

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

  // Function to manually refresh the invoices list
  const refreshInvoices = () => {
    setLastRefresh(Date.now());
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  useEffect(() => {
    // Add event listener for focus to refresh data when returning to the page
    const handleFocus = () => {
      if (craftsmanId) {
        refreshInvoices();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Add event listener for visibility change to refresh data when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && craftsmanId) {
        refreshInvoices();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [craftsmanId]);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#0a1929] text-white">
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Invoices & Quotes</h1>
            <div className="flex space-x-2">
              <button
                onClick={refreshInvoices}
                className="p-2 bg-[#1e3a5f] hover:bg-[#2a4d76] rounded-xl transition-colors"
                title="Refresh invoices"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
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
                  className="w-full bg-[#0a1929] border border-[#2a4d76] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
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
                className="w-full bg-[#0a1929] border border-[#2a4d76] rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
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
              ))}
            </div>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}
