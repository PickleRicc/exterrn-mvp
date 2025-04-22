'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { invoicesAPI, appointmentsAPI, customersAPI } from '../lib/api';
import { formatDate } from '@/lib/utils/dateUtils';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [craftsmanId, setCraftsmanId] = useState(null);
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices', 'quotes', 'drafts'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  const [refreshKey, setRefreshKey] = useState(0); // Used to force refresh
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
        } else if (tokenData.id) {
          // Some systems might use just 'id' for the craftsman
          extractedCraftsmanId = tokenData.id;
        } else if (tokenData.userId) {
          // Last resort - use userId if no other ID is available
          extractedCraftsmanId = tokenData.userId;
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
      // Redirect to login page
      router.push('/login');
    }
  }, []);

  // Refresh the invoice list when the component mounts or when refreshKey changes
  useEffect(() => {
    if (craftsmanId) {
      fetchInvoices();
    }
  }, [craftsmanId, activeTab, refreshKey]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      
      // Build filters based on active tab and other filter settings
      const filters = {
        craftsman_id: craftsmanId
      };
      
      console.log('Using craftsman ID for filter:', craftsmanId);
      
      // Set document type based on active tab
      if (activeTab === 'invoices') {
        filters.type = 'invoice';
      } else if (activeTab === 'quotes') {
        filters.type = 'quote';
      }
      
      // If on drafts tab, filter by draft status regardless of type
      if (activeTab === 'drafts') {
        filters.status = 'draft';
        // Remove type filter for drafts to show both invoice and quote drafts
        delete filters.type;
      } else if (statusFilter) {
        // Otherwise apply any selected status filter
        filters.status = statusFilter;
      }
      
      // Apply date filters if set
      if (dateFilter.from) {
        filters.from_date = dateFilter.from;
      }
      
      if (dateFilter.to) {
        filters.to_date = dateFilter.to;
      }
      
      // Apply search term if set
      if (searchTerm.trim()) {
        filters.search = searchTerm.trim();
      }
      
      console.log('Fetching invoices with filters:', filters);
      const data = await invoicesAPI.getAll(filters);
      console.log('Fetched invoices:', data);
      
      if (Array.isArray(data)) {
        setInvoices(data);
        setFilteredInvoices(data);
      } else {
        console.error('Expected array of invoices but got:', data);
        setInvoices([]);
        setFilteredInvoices([]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Failed to load invoices. Please try again later.');
      setInvoices([]);
      setFilteredInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Reset filters when changing tabs
    setStatusFilter('');
    setSearchTerm('');
    setDateFilter({ from: '', to: '' });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchInvoices();
  };

  const clearFilters = () => {
    setStatusFilter('');
    setSearchTerm('');
    setDateFilter({ from: '', to: '' });
    fetchInvoices();
  };
  
  const refreshInvoices = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/20 text-green-400';
      case 'overdue':
        return 'bg-red-500/20 text-red-400';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'cancelled':
        return 'bg-gray-500/20 text-gray-400';
      case 'draft':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getDocumentTitle = () => {
    switch (activeTab) {
      case 'invoices':
        return 'Invoices';
      case 'quotes':
        return 'Quotes';
      case 'drafts':
        return 'Drafts';
      default:
        return 'Documents';
    }
  };

  const getCreateButtonText = () => {
    switch (activeTab) {
      case 'invoices':
        return 'Create Invoice';
      case 'quotes':
        return 'Create Quote';
      case 'drafts':
        return 'Create Draft';
      default:
        return 'Create Document';
    }
  };

  const getCreateButtonLink = () => {
    switch (activeTab) {
      case 'quotes':
        return '/invoices/new?type=quote';
      case 'drafts':
        return '/invoices/new'; // Drafts are created by default
      default:
        return '/invoices/new';
    }
  };

  const getEmptyStateText = () => {
    switch (activeTab) {
      case 'invoices':
        return 'You haven\'t created any invoices yet.';
      case 'quotes':
        return 'You haven\'t created any quotes yet.';
      case 'drafts':
        return 'You don\'t have any draft documents.';
      default:
        return 'No documents found.';
    }
  };

  const getDocumentTypeLabel = (invoice) => {
    return invoice.type === 'quote' ? 'Quote' : 'Invoice';
  };

  const handleRefresh = () => {
    console.log('Manually refreshing invoices...');
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
        <main className="container mx-auto px-5 py-8 max-w-7xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">
                {getDocumentTitle()}
              </span>
            </h1>
            <div className="flex space-x-2">
              <button
                onClick={handleRefresh}
                className="bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-xl transition-colors"
              >
                Refresh
              </button>
              <Link
                href={getCreateButtonLink()}
                className="bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white font-medium py-2 px-4 rounded-xl focus:outline-none shadow-md hover:shadow-lg transition-all duration-300"
              >
                {getCreateButtonText()}
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex mb-6 border-b border-white/10">
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === 'invoices'
                  ? 'text-[#00c2ff] border-b-2 border-[#00c2ff]'
                  : 'text-white/70 hover:text-white'
              }`}
              onClick={() => handleTabChange('invoices')}
            >
              Invoices
            </button>
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === 'quotes'
                  ? 'text-[#00c2ff] border-b-2 border-[#00c2ff]'
                  : 'text-white/70 hover:text-white'
              }`}
              onClick={() => handleTabChange('quotes')}
            >
              Quotes
            </button>
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === 'drafts'
                  ? 'text-[#00c2ff] border-b-2 border-[#00c2ff]'
                  : 'text-white/70 hover:text-white'
              }`}
              onClick={() => handleTabChange('drafts')}
            >
              Drafts
            </button>
          </div>

          {/* Search and filters */}
          <div className="mb-6">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by customer name or invoice number"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white/10 border border-white/20 text-white rounded-xl w-full py-2 px-3 focus:outline-none focus:border-[#00c2ff] transition-colors"
                />
              </div>
              
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white/10 border border-white/20 text-white rounded-xl w-full py-2 px-3 focus:outline-none focus:border-[#00c2ff] transition-colors"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              <div>
                <input
                  type="date"
                  placeholder="From Date"
                  value={dateFilter.from}
                  onChange={(e) => setDateFilter({...dateFilter, from: e.target.value})}
                  className="bg-white/10 border border-white/20 text-white rounded-xl w-full py-2 px-3 focus:outline-none focus:border-[#00c2ff] transition-colors"
                />
              </div>
              
              <div>
                <input
                  type="date"
                  placeholder="To Date"
                  value={dateFilter.to}
                  onChange={(e) => setDateFilter({...dateFilter, to: e.target.value})}
                  className="bg-white/10 border border-white/20 text-white rounded-xl w-full py-2 px-3 focus:outline-none focus:border-[#00c2ff] transition-colors"
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white font-medium rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-all duration-300"
                >
                  Filter
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg px-4 py-2 transition-colors"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64 my-8">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#00c2ff]"></div>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl my-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          ) : invoices.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-8 text-center border border-white/10">
              <p className="text-white/70 mb-4">{getEmptyStateText()}</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link 
                  href={getCreateButtonLink()} 
                  className="text-[#00c2ff] hover:text-[#0090ff] font-medium"
                >
                  Create your first {activeTab === 'quotes' ? 'quote' : activeTab === 'drafts' ? 'draft' : 'invoice'}
                </Link>
                <button
                  onClick={handleRefresh}
                  className="text-white/70 hover:text-white font-medium"
                >
                  or refresh the list
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {invoices.map((invoice) => (
                <div 
                  key={invoice.id} 
                  className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden hover:bg-white/10 transition-all duration-300 cursor-pointer"
                  onClick={() => router.push(`/invoices/${invoice.id}`)}
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {getDocumentTypeLabel(invoice)} #{invoice.invoice_number || invoice.id}
                        </h3>
                        <p className="text-sm text-white/70">
                          {invoice.customer_name || 'Customer'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(invoice.status || 'pending')}`}>
                        {invoice.status ? (invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)) : 'Pending'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between mb-3">
                      <div className="text-sm">
                        <p className="text-white/50">Amount</p>
                        <p className="font-medium text-white">€{parseFloat(invoice.total_amount || 0).toFixed(2)}</p>
                      </div>
                      <div className="text-sm text-right">
                        <p className="text-white/50">Date</p>
                        <p className="font-medium text-white">{invoice.created_at ? formatDate(invoice.created_at) : 'N/A'}</p>
                      </div>
                    </div>
                    
                    {invoice.due_date && (
                      <div className="text-sm">
                        <p className="text-white/50">Due Date</p>
                        <p className="font-medium text-white">{formatDate(invoice.due_date)}</p>
                      </div>
                    )}
                    
                    {/* Show items count if available */}
                    {invoice.items && invoice.items.length > 0 && (
                      <div className="text-sm mt-2 text-white/70">
                        {invoice.items.length} {invoice.items.length === 1 ? 'item' : 'items'}
                      </div>
                    )}
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