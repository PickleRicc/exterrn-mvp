'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../lib/api';
import { quotesAPI } from '../../lib/api/quotesAPI';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { generateInvoicePdf } from '../../lib/utils/pdfGenerator';
import { useRouter } from 'next/navigation';

export default function QuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [craftsmanId, setCraftsmanId] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [processingQuoteId, setProcessingQuoteId] = useState(null);
  // Status filter removed for quotes
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredQuotes, setFilteredQuotes] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusUpdateId, setStatusUpdateId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [success, setSuccess] = useState('');
  const [converting, setConverting] = useState(false);
  const [convertingId, setConvertingId] = useState(null);

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
          const craftsmanIdStr = String(extractedCraftsmanId);
          console.log('Setting craftsman ID to:', craftsmanIdStr);
          setCraftsmanId(craftsmanIdStr);
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
      setError('You are not logged in. Please log in to view quotes.');
      router.push('/auth/login');
    }
  }, [router]);

  useEffect(() => {
    if (craftsmanId) {
      fetchQuotes();
    }
  }, [craftsmanId]);

  useEffect(() => {
    if (quotes.length > 0) {
      let filtered = [...quotes];
      
      // Filter by search term (customer name or quote ID)
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(quote => 
          (quote.customer_name && quote.customer_name.toLowerCase().includes(term)) || 
          (quote.id && String(quote.id).includes(term))
        );
      }
      
      setFilteredQuotes(filtered);
    } else {
      setFilteredQuotes([]);
    }
  }, [quotes, searchTerm]);

  // Add event listener for focus to refresh data when returning to the page
  useEffect(() => {
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [craftsmanId]);

  const handleFocus = () => {
    if (craftsmanId) {
      console.log('Window focused, refreshing quotes data');
      fetchQuotes();
    }
  };
  
  // Add event listener for visibility change to refresh data when tab becomes visible
  const handleVisibilityChange = () => {
    if (!document.hidden && craftsmanId) {
      console.log('Tab became visible, refreshing quotes data');
      fetchQuotes();
    }
  };

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      
      // Get fresh craftsman ID from token if not available
      let currentCraftsmanId = craftsmanId;
      if (!currentCraftsmanId) {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const tokenData = JSON.parse(atob(token.split('.')[1]));
            if (tokenData.craftsmanId) {
              currentCraftsmanId = String(tokenData.craftsmanId);
              console.log('Retrieved craftsman ID from token:', currentCraftsmanId);
            }
          } catch (err) {
            console.error('Error extracting craftsman ID from token:', err);
          }
        }
      }
      
      if (!currentCraftsmanId) {
        console.error('Cannot fetch quotes: No craftsman ID available');
        setError('Authentication error: Please log in again');
        return;
      }
      
      console.log('Fetching quotes with craftsman_id:', currentCraftsmanId);
      
      // Use quotesAPI to fetch only quotes for this craftsman
      const data = await quotesAPI.getAll({ craftsman_id: currentCraftsmanId });
      
      console.log('Fetched quotes:', data);
      setQuotes(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching quotes:', err);
      setError('Failed to load quotes. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePdf = async (quote) => {
    try {
      setPdfLoading(true);
      setProcessingQuoteId(quote.id);
      
      // Get craftsman data from localStorage if available
      const craftsmanData = {
        name: localStorage.getItem('userName') || 'Craftsman',
        email: localStorage.getItem('userEmail') || '',
        phone: '',
        address: ''
      };
      
      // Use the dedicated API method to generate a PDF
      await quotesAPI.generatePdf(quote, craftsmanData);
      
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF. Please try again later.');
      
      // Clear error after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    } finally {
      setPdfLoading(false);
      setProcessingQuoteId(null);
    }
  };

  const handleStatusUpdate = async (quoteId, newStatus) => {
    try {
      setUpdatingStatus(true);
      setStatusUpdateId(quoteId);
      
      // Update the quote status
      await api.put(`/invoices/${quoteId}/status`, { 
        status: newStatus,
        craftsman_id: craftsmanId
      });
      
      // Refresh quotes data
      fetchQuotes();
      
      setSuccess(`Quote status updated to ${newStatus} successfully`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error updating quote status:', err);
      setError('Failed to update quote status. Please try again later.');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    } finally {
      setUpdatingStatus(false);
      setStatusUpdateId(null);
    }
  };

  const handleDelete = async (id, e) => {
    e.preventDefault();
    
    // Confirm before deleting
    if (!window.confirm('Are you sure you want to delete this quote? This action cannot be undone.')) {
      return;
    }
    
    try {
      setDeletingId(id);
      
      // Delete the quote
      await api.delete(`/invoices/${id}`, {
        params: { craftsman_id: craftsmanId }
      });
      
      // Remove the deleted quote from state
      setQuotes(prevQuotes => prevQuotes.filter(quote => quote.id !== id));
      
      setSuccess('Quote deleted successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error deleting quote:', err);
      setError('Failed to delete quote. Please try again later.');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    } finally {
      setDeletingId(null);
    }
  };

  const handleConvertToInvoice = async (quoteId) => {
    try {
      setConverting(true);
      setConvertingId(quoteId);
      
      // Convert quote to invoice using the dedicated API method
      const response = await quotesAPI.convertToInvoice(quoteId, craftsmanId);
      
      console.log('Quote converted to invoice:', response);
      
      // Show success message
      setSuccess('Quote successfully converted to invoice');
      
      // Refresh quotes data to remove the converted quote
      fetchQuotes();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
      // Redirect to the new invoice page if a new invoice was created
      if (response && response.newInvoice && response.newInvoice.id) {
        router.push(`/invoices/${response.newInvoice.id}`);
      }
    } catch (err) {
      console.error('Error converting quote to invoice:', err);
      setError('Failed to convert quote to invoice. Please try again later.');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    } finally {
      setConverting(false);
      setConvertingId(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-700/20 text-yellow-400';
      case 'approved':
        return 'bg-green-700/20 text-green-400';
      case 'rejected':
        return 'bg-red-700/20 text-red-400';
      case 'expired':
        return 'bg-gray-700/20 text-gray-400';
      default:
        return 'bg-blue-700/20 text-blue-400';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#0a1929] text-white p-6">
        <main className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Quotes</h1>
            <Link 
              href="/quotes/new" 
              className="px-4 py-2 bg-[#e91e63] hover:bg-[#c2185b] rounded-lg flex items-center transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Create New Quote
            </Link>
          </div>
          
          {error && (
            <div className="bg-red-900/20 border border-red-800 text-red-400 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-900/20 border border-green-800 text-green-400 p-4 rounded-lg mb-6">
              {success}
            </div>
          )}
          
          <div className="bg-[#132f4c] p-6 rounded-lg mb-8">
            <div className="flex flex-col">
              <div className="w-full">
                <label className="block text-sm text-gray-400 mb-1">Search</label>
                <input 
                  type="text" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by customer name or quote ID..." 
                  className="w-full px-4 py-2 rounded-lg bg-[#1e3a5f]/50 text-white border border-[#234a6f] focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                />
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#e91e63]"></div>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="bg-[#132f4c] p-8 rounded-lg text-center">
              <svg className="w-16 h-16 mx-auto text-[#234a6f] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <h3 className="text-xl font-medium mb-2">No Quotes Found</h3>
              <p className="text-gray-400 mb-6">You don't have any quotes that match your filters.</p>
              <Link 
                href="/quotes/new" 
                className="px-4 py-2 bg-[#e91e63] hover:bg-[#c2185b] rounded-lg inline-flex items-center transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Create Your First Quote
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredQuotes.map(quote => (
                <div key={quote.id} className="bg-[#132f4c] rounded-xl overflow-hidden border border-[#1e3a5f] hover:border-[#234a6f] transition-colors">
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-lg">
                        {quote.customer_name || 'No Customer Name'}{' '}
                        <span className="text-sm text-gray-400">(Quote #{quote.id || 'N/A'})</span>
                      </h3>
                    </div>
                    
                    <div className="text-sm text-gray-300">
                      {quote.description || 'No description available'}
                    </div>
                    
                    <div className="font-medium text-xl text-[#e91e63]">
                      €{typeof quote.total_amount === 'number' ? quote.total_amount.toFixed(2) : 
                         parseFloat(quote.total_amount) ? parseFloat(quote.total_amount).toFixed(2) : '0.00'}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 text-sm">
                      <div>
                        <span className="text-gray-400">Created:</span>
                        <span>{formatDate(quote.created_at)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Valid Until:</span>
                        <span>{formatDate(quote.due_date)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between p-4 border-t border-[#1e3a5f] bg-[#0f2544]">
                    <Link 
                      href={`/invoices/${quote.id}?type=quote`}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                      View Details
                    </Link>
                    <div className="flex space-x-2">
                      {/* Status toggle removed */}
                      
                      <Link
                        href={`/invoices/new?quote_id=${quote.id}`}
                        className="px-3 py-1 bg-green-700/20 hover:bg-green-700/30 text-green-400 text-sm font-medium rounded-xl transition-colors"
                      >
                        Create Invoice
                      </Link>
                      
                      <button
                        onClick={() => handleGeneratePdf(quote)}
                        disabled={pdfLoading && processingQuoteId === quote.id}
                        className={`px-3 py-1 ${pdfLoading && processingQuoteId === quote.id ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed' : 'bg-[#e91e63]/20 hover:bg-[#e91e63]/30 text-[#e91e63] cursor-pointer'} text-sm font-medium rounded-xl transition-colors flex items-center`}
                      >
                        {pdfLoading && processingQuoteId === quote.id ? (
                          <>
                            <span className="mr-2 h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                            Processing...
                          </>
                        ) : 'Download PDF'}
                      </button>
                      
                      <button
                        onClick={(e) => handleDelete(quote.id, e)}
                        disabled={deletingId === quote.id}
                        className="px-3 py-1 bg-red-700/20 hover:bg-red-700/40 text-red-400 text-sm font-medium rounded-xl transition-colors"
                      >
                        {deletingId === quote.id ? 'Deleting...' : 'Delete'}
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
