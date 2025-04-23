'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { invoicesAPI } from '../lib/api';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [craftsmanId, setCraftsmanId] = useState(null);

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
  }, [craftsmanId]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await invoicesAPI.getAll(craftsmanId);
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

  const handleGeneratePdf = async (id) => {
    try {
      await invoicesAPI.generatePdf(id, craftsmanId);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again later.');
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

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#0a1929] text-white">
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Invoices</h1>
            <Link 
              href="/invoices/new" 
              className="px-4 py-2 bg-[#e91e63] hover:bg-[#d81b60] text-white font-medium rounded-xl transition-colors"
            >
              Create New Invoice
            </Link>
          </div>
          
          {error && (
            <div className="bg-red-500/20 text-red-400 p-4 rounded-xl mb-6">
              {error}
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#e91e63]"></div>
            </div>
          ) : invoices.length === 0 ? (
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
              {invoices.map((invoice) => (
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
                      onClick={() => handleGeneratePdf(invoice.id)}
                      className="px-3 py-1 bg-[#e91e63]/20 hover:bg-[#e91e63]/30 text-[#e91e63] text-sm font-medium rounded-xl transition-colors"
                    >
                      Download PDF
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
