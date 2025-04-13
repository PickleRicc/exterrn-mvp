'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { invoicesAPI } from '../../lib/api';
import { formatDate, formatCurrency } from '@/lib/utils/dateUtils';
import { use } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function InvoiceDetailPage({ params }) {
  // Use React.use() to unwrap params
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const data = await invoicesAPI.getById(id);
        setInvoice(data);
        setError(null);
      } catch (err) {
        console.error(`Error fetching invoice ${id}:`, err);
        setError('Failed to load invoice. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdating(true);
      await invoicesAPI.update(id, { status: newStatus });
      
      // Update local state
      setInvoice(prev => ({ ...prev, status: newStatus }));
      
    } catch (err) {
      console.error(`Error updating invoice status:`, err);
      setError('Failed to update invoice status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    
    try {
      setDeleting(true);
      await invoicesAPI.delete(id);
      
      // Redirect back to invoices list
      router.push('/invoices');
      
    } catch (err) {
      console.error(`Error deleting invoice:`, err);
      setError('Failed to delete invoice. Please try again.');
      setDeleting(false);
      setConfirmDelete(false);
    }
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
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
          <main className="container mx-auto px-5 py-8 max-w-7xl">
            <h1 className="text-3xl font-bold mb-6">
              <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">
                Invoice Details
              </span>
            </h1>
            <div className="flex justify-center items-center h-64 my-8">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#00c2ff]"></div>
            </div>
          </main>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
          <main className="container mx-auto px-5 py-8 max-w-7xl">
            <h1 className="text-3xl font-bold mb-6">
              <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">
                Invoice Details
              </span>
            </h1>
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl my-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          </main>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
        <main className="container mx-auto px-5 py-8 max-w-7xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">
                Invoice #{invoice.invoice_number}
              </span>
            </h1>
            <Link 
              href="/invoices" 
              className="text-[#00c2ff] hover:text-[#0090ff] font-medium"
            >
              Back to Invoices
            </Link>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex flex-col md:flex-row justify-between mb-6">
                <div className="mb-4 md:mb-0">
                  <h3 className="text-white/70 font-medium mb-2">Customer</h3>
                  <p className="text-white font-semibold">{invoice.customer_name}</p>
                  <p className="text-white">{invoice.customer_phone}</p>
                  {invoice.customer_email && <p className="text-white">{invoice.customer_email}</p>}
                  {invoice.customer_address && <p className="text-white">{invoice.customer_address}</p>}
                </div>
                
                <div className="mb-4 md:mb-0">
                  <h3 className="text-white/70 font-medium mb-2">Appointment</h3>
                  <p className="text-white">Date: {formatDate(invoice.scheduled_at)}</p>
                  {invoice.appointment_notes && (
                    <p className="text-white">Notes: {invoice.appointment_notes}</p>
                  )}
                </div>
                
                <div>
                  <h3 className="text-white/70 font-medium mb-2">Status</h3>
                  <span className={`px-3 py-1 rounded-xl text-sm font-medium ${getStatusBadgeClass(invoice.status)}`}>
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </span>
                </div>
              </div>
              
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-white/70 font-medium mb-2">Invoice Details</h3>
                <p className="text-white">Amount: €{parseFloat(invoice.amount).toFixed(2)}</p>
                <p className="text-white">Tax: €{parseFloat(invoice.tax_amount || 0).toFixed(2)}</p>
                <p className="text-white font-semibold">Total: €{parseFloat(invoice.total_amount).toFixed(2)}</p>
                {invoice.due_date && (
                  <p className="text-white">Due Date: {formatDate(invoice.due_date)}</p>
                )}
              </div>
            </div>

            {invoice.notes && (
              <div className="mb-6 px-6">
                <h3 className="text-white/70 font-medium mb-2">Notes</h3>
                <p className="text-white">{invoice.notes}</p>
              </div>
            )}

            {invoice.payment_link && (
              <div className="mb-6 px-6">
                <h3 className="text-white/70 font-medium mb-2">Payment Link</h3>
                <a 
                  href={invoice.payment_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#00c2ff] hover:text-[#0090ff] font-medium"
                >
                  Pay Invoice Online
                </a>
              </div>
            )}

            <div className="bg-white/5 px-6 py-4 border-t border-white/10">
              <div className="flex flex-wrap justify-between items-center">
                <div className="flex space-x-2 mb-2 sm:mb-0">
                  <button
                    onClick={() => handleStatusChange('pending')}
                    disabled={invoice.status === 'pending' || updating}
                    className={`px-3 py-1 rounded-xl text-sm font-medium ${
                      invoice.status === 'pending' 
                        ? 'bg-yellow-500/20 text-yellow-400 cursor-not-allowed' 
                        : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                    }`}
                  >
                    Mark as Pending
                  </button>
                  <button
                    onClick={() => handleStatusChange('paid')}
                    disabled={invoice.status === 'paid' || updating}
                    className={`px-3 py-1 rounded-xl text-sm font-medium ${
                      invoice.status === 'paid' 
                        ? 'bg-green-500/20 text-green-400 cursor-not-allowed' 
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}
                  >
                    Mark as Paid
                  </button>
                  <button
                    onClick={() => handleStatusChange('overdue')}
                    disabled={invoice.status === 'overdue' || updating}
                    className={`px-3 py-1 rounded-xl text-sm font-medium ${
                      invoice.status === 'overdue' 
                        ? 'bg-red-500/20 text-red-400 cursor-not-allowed' 
                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    }`}
                  >
                    Mark as Overdue
                  </button>
                </div>
                
                <div className="flex space-x-2">
                  <Link
                    href={`/invoices/${id}/edit`}
                    className="px-4 py-2 bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    Edit Invoice
                  </Link>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className={`px-4 py-2 rounded-xl text-sm font-medium ${
                      confirmDelete 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {confirmDelete ? 'Confirm Delete' : 'Delete Invoice'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}