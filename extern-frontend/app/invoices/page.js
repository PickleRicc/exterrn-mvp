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
  const router = useRouter();

  useEffect(() => {
    // Get craftsman ID from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        if (tokenData.craftsmanId) {
          setCraftsmanId(tokenData.craftsmanId);
        }
      } catch (err) {
        console.error('Error parsing token:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (craftsmanId) {
      fetchInvoices();
    }
  }, [craftsmanId, activeTab]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      
      // Build filters based on active tab and other filter settings
      const filters = {
        craftsman_id: craftsmanId
      };
      
      // Set document type based on active tab
      if (activeTab === 'invoices') {
        filters.type = 'invoice';
      } else if (activeTab === 'quotes') {
        filters.type = 'quote';
      }
      
      // If on drafts tab, filter by draft status
      if (activeTab === 'drafts') {
        filters.status = 'draft';
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
      
      const data = await invoicesAPI.getAll(filters);
      setInvoices(data);
      setFilteredInvoices(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Failed to load invoices. Please try again later.');
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
        return 'Create New';
    }
  };

  const getCreateButtonLink = () => {
    switch (activeTab) {
      case 'quotes':
        return '/invoices/new?type=quote';
      default:
        return '/invoices/new';
    }
  };

  const getEmptyStateText = () => {
    switch (activeTab) {
      case 'invoices':
        return 'No invoices found';
      case 'quotes':
        return 'No quotes found';
      case 'drafts':
        return 'No drafts found';
      default:
        return 'No documents found';
    }
  };

  const getDocumentTypeLabel = (invoice) => {
    if (invoice.type === 'quote') {
      return 'Quote';
    } else {
      return 'Invoice';
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
        <main className="container mx-auto px-5 py-8 max-w-7xl">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
            <h1 className="text-3xl font-bold mb-4 md:mb-0">
              <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">
                {getDocumentTitle()}
              </span>
            </h1>
            <Link 
              href={getCreateButtonLink()} 
              className="px-4 py-2 bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
            >
              {getCreateButtonText()}
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex mb-6 border-b border-white/10">
            <button
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'invoices'
                  ? 'text-[#00c2ff] border-b-2 border-[#00c2ff]'
                  : 'text-white/70 hover:text-white'
              }`}
              onClick={() => handleTabChange('invoices')}
            >
              Invoices
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'quotes'
                  ? 'text-[#00c2ff] border-b-2 border-[#00c2ff]'
                  : 'text-white/70 hover:text-white'
              }`}
              onClick={() => handleTabChange('quotes')}
            >
              Quotes
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'drafts'
                  ? 'text-[#00c2ff] border-b-2 border-[#00c2ff]'
                  : 'text-white/70 hover:text-white'
              }`}
              onClick={() => handleTabChange('drafts')}
            >
              Drafts
            </button>
          </div>

          {/* Search and Filters */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 mb-6">
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <label htmlFor="search" className="block text-white/70 text-sm mb-1">
                  Search
                </label>
                <input
                  type="text"
                  id="search"
                  placeholder="Search by customer or document number"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00c2ff]"
                />
              </div>

              {/* Status Filter - Not shown on Drafts tab */}
              {activeTab !== 'drafts' && (
                <div>
                  <label htmlFor="status" className="block text-white/70 text-sm mb-1">
                    Status
                  </label>
                  <select
                    id="status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00c2ff]"
                  >
                    <option value="">All</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}

              {/* Date Filter */}
              <div className={activeTab !== 'drafts' ? '' : 'md:col-span-2'}>
                <label htmlFor="date" className="block text-white/70 text-sm mb-1">
                  Date Range
                </label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    placeholder="From"
                    value={dateFilter.from}
                    onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00c2ff]"
                  />
                  <input
                    type="date"
                    placeholder="To"
                    value={dateFilter.to}
                    onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00c2ff]"
                  />
                </div>
              </div>

              {/* Filter Buttons */}
              <div className="flex space-x-2 items-end">
                <button
                  type="submit"
                  className="bg-[#00c2ff] hover:bg-[#00b0e6] text-white font-medium rounded-lg px-4 py-2 transition-colors"
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
              <Link 
                href={getCreateButtonLink()} 
                className="text-[#00c2ff] hover:text-[#0090ff] font-medium"
              >
                Create your first {activeTab === 'quotes' ? 'quote' : activeTab === 'drafts' ? 'draft' : 'invoice'}
              </Link>
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
                          {getDocumentTypeLabel(invoice)} #{invoice.invoice_number}
                        </h3>
                        <p className="text-sm text-white/70">
                          {invoice.customer_name || 'Customer'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}>
                        {invoice.status || 'pending'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between mb-3">
                      <div className="text-sm">
                        <p className="text-white/50">Amount</p>
                        <p className="font-medium text-white">€{parseFloat(invoice.total_amount).toFixed(2)}</p>
                      </div>
                      <div className="text-sm text-right">
                        <p className="text-white/50">Date</p>
                        <p className="font-medium text-white">{formatDate(invoice.created_at)}</p>
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