'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { invoicesAPI, appointmentsAPI, customersAPI } from '../lib/api';
import { formatDate } from '@/lib/utils/dateUtils';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]); // Added this line
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [craftsmanId, setCraftsmanId] = useState(null);
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
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        
        // Only fetch invoices for the current craftsman
        const filters = {};
        if (craftsmanId) {
          filters.craftsman_id = craftsmanId;
        }
        
        const data = await invoicesAPI.getAll(filters);
        setInvoices(data);
        setFilteredInvoices(data); // Added this line
        setError(null);
      } catch (err) {
        console.error('Error fetching invoices:', err);
        setError('Failed to load invoices. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (craftsmanId) {
      fetchInvoices();
    }
  }, [craftsmanId]);

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
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
      <main className="container mx-auto px-5 py-8 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">
              Invoices
            </span>
          </h1>
          <Link 
            href="/invoices/new" 
            className="px-4 py-2 bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
          >
            Create Invoice
          </Link>
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
            <p className="text-white/70 mb-4">No invoices found</p>
            <Link 
              href="/invoices/new" 
              className="text-[#00c2ff] hover:text-[#0090ff] font-medium"
            >
              Create your first invoice
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
                        Invoice #{invoice.invoice_number}
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
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}