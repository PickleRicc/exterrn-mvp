'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { invoicesAPI } from '../../lib/api';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function InvoiceDetailPage({ params }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invoice, setInvoice] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);
  
  const router = useRouter();
  const { id } = params;

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    fetchInvoice();
  }, [id, router]);

  const fetchInvoice = async () => {
    try {
      const invoiceData = await invoicesAPI.getById(id);
      setInvoice(invoiceData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError('Failed to load invoice. Please try again.');
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '€0.00';
    
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const handleDownloadPDF = async () => {
    setProcessingAction('download');
    setError('');
    
    try {
      const blob = await invoicesAPI.generatePDF(id);
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Invoice_${invoice.invoice_number.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading invoice PDF:', err);
      setError('Failed to download invoice PDF. Please try again.');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleSendEmail = async () => {
    setProcessingAction('email');
    setError('');
    setSuccess('');
    
    try {
      await invoicesAPI.sendEmail(id);
      setSuccess('Invoice email sent successfully.');
    } catch (err) {
      console.error('Error sending invoice email:', err);
      setError('Failed to send invoice email. Please try again.');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    setProcessingAction('status');
    setError('');
    setSuccess('');
    
    try {
      await invoicesAPI.update(id, { status: newStatus });
      setSuccess(`Invoice status updated to ${newStatus}.`);
      
      // Refresh invoice data
      fetchInvoice();
    } catch (err) {
      console.error('Error updating invoice status:', err);
      setError('Failed to update invoice status. Please try again.');
    } finally {
      setProcessingAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#071a2b] to-[#132f4c]">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00c2ff]"></div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#071a2b] to-[#132f4c]">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="bg-[#132f4c]/50 backdrop-blur-sm rounded-xl border border-white/10 shadow-xl p-6 mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">Invoice Not Found</h1>
            {error && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6">
                <p>{error}</p>
              </div>
            )}
            <a
              href="/invoices"
              className="inline-flex items-center px-4 py-2 bg-[#071a2b] hover:bg-[#0a2540] text-white rounded-lg border border-white/10 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              Back to Invoices
            </a>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#071a2b] to-[#132f4c]">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="bg-[#132f4c]/50 backdrop-blur-sm rounded-xl border border-white/10 shadow-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <div className="flex items-center mb-2">
                <a
                  href="/invoices"
                  className="mr-3 text-white/70 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                  </svg>
                </a>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Invoice #{invoice.invoice_number}</h1>
              </div>
              <div className="flex items-center">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(invoice.status)}`}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
              <button
                onClick={handleDownloadPDF}
                disabled={processingAction === 'download'}
                className="px-4 py-2 bg-[#071a2b] hover:bg-[#0a2540] text-white rounded-lg border border-white/10 transition-colors flex items-center"
              >
                {processingAction === 'download' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
                    </svg>
                    Download PDF
                  </>
                )}
              </button>
              
              <button
                onClick={handleSendEmail}
                disabled={processingAction === 'email'}
                className="px-4 py-2 bg-[#071a2b] hover:bg-[#0a2540] text-white rounded-lg border border-white/10 transition-colors flex items-center"
              >
                {processingAction === 'email' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                    Send Email
                  </>
                )}
              </button>
              
              {invoice.status !== 'paid' && (
                <button
                  onClick={() => handleUpdateStatus('paid')}
                  disabled={processingAction === 'status'}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-800 text-white rounded-lg shadow hover:shadow-lg transition-all flex items-center"
                >
                  {processingAction === 'status' ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      Mark as Paid
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6">
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-900/20 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg mb-6">
              <p>{success}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-[#071a2b]/50 rounded-xl border border-white/10 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Invoice Details</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/70">Invoice Number:</span>
                  <span className="text-white font-medium">{invoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Created Date:</span>
                  <span className="text-white">{formatDate(invoice.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Due Date:</span>
                  <span className="text-white">{formatDate(invoice.due_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Status:</span>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(invoice.status)}`}>
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </span>
                </div>
                {invoice.appointment_title && (
                  <div className="flex justify-between">
                    <span className="text-white/70">Appointment:</span>
                    <span className="text-white">{invoice.appointment_title}</span>
                  </div>
                )}
                {invoice.appointment_date && (
                  <div className="flex justify-between">
                    <span className="text-white/70">Service Date:</span>
                    <span className="text-white">{formatDate(invoice.appointment_date)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-[#071a2b]/50 rounded-xl border border-white/10 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Customer Information</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/70">Name:</span>
                  <span className="text-white">{invoice.customer_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Email:</span>
                  <span className="text-white">{invoice.customer_email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Address:</span>
                  <span className="text-white">{invoice.customer_address || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <a
                    href={`/customers/${invoice.customer_id}`}
                    className="text-[#00c2ff] hover:text-white transition-colors inline-flex items-center"
                  >
                    <span>View Customer Profile</span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-[#071a2b]/50 rounded-xl border border-white/10 p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Invoice Items</h2>
            
            {invoice.items && invoice.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-white/90">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-right">Quantity</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, index) => (
                      <tr key={index} className="border-b border-white/5">
                        <td className="px-4 py-3">
                          {item.material_name ? (
                            <div>
                              <span className="font-medium">{item.material_name}</span>
                              <p className="text-white/70 text-sm">{item.description}</p>
                            </div>
                          ) : (
                            item.description
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-white/70">No items found for this invoice.</p>
            )}
          </div>
          
          <div className="bg-[#071a2b]/50 rounded-xl border border-white/10 p-6">
            <div className="flex flex-col items-end space-y-2">
              <div className="flex justify-between w-full md:w-1/3">
                <span className="text-white/70">Subtotal:</span>
                <span className="text-white">{formatCurrency(invoice.amount)}</span>
              </div>
              <div className="flex justify-between w-full md:w-1/3">
                <span className="text-white/70">VAT (19%):</span>
                <span className="text-white">{formatCurrency(invoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between w-full md:w-1/3 border-t border-white/10 pt-2 mt-2">
                <span className="text-white font-medium">Total:</span>
                <span className="text-white font-bold text-xl">{formatCurrency(invoice.total_amount)}</span>
              </div>
            </div>
          </div>
          
          {invoice.notes && (
            <div className="bg-[#071a2b]/50 rounded-xl border border-white/10 p-6 mt-8">
              <h2 className="text-xl font-semibold text-white mb-4">Notes</h2>
              <p className="text-white/80 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
