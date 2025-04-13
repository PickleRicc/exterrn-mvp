'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { invoicesAPI, customersAPI } from '../lib/api';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState({});
  const [craftsmanId, setCraftsmanId] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, paid
  const [processingInvoice, setProcessingInvoice] = useState(null);
  
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // Get craftsman ID from token
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      if (tokenData.craftsmanId) {
        setCraftsmanId(tokenData.craftsmanId);
        fetchData(tokenData.craftsmanId);
      } else {
        setError('Your account is not set up as a craftsman. Please contact support.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error parsing token:', err);
      setError('Session error. Please log in again.');
      setLoading(false);
    }
  }, [router]);

  const fetchData = async (craftsmanId) => {
    try {
      // Fetch invoices
      const invoicesData = await invoicesAPI.getAll({ craftsman_id: craftsmanId });
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      
      // Fetch customers to display names
      const customersData = await customersAPI.getAll({ craftsman_id: craftsmanId });
      
      // Create a map of customer IDs to customer objects
      const customersMap = {};
      if (Array.isArray(customersData)) {
        customersData.forEach(customer => {
          customersMap[customer.id] = customer;
        });
      } else {
        console.error('Customer data is not an array:', customersData);
      }
      
      setCustomers(customersMap);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load invoices. Please try again.');
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
        return 'bg-green-100/80 text-green-800 border border-green-200/50';
      case 'pending':
        return 'bg-yellow-100/80 text-yellow-800 border border-yellow-200/50';
      case 'cancelled':
        return 'bg-red-100/80 text-red-800 border border-red-200/50';
      default:
        return 'bg-gray-100/80 text-gray-800 border border-gray-200/50';
    }
  };

  const getFilteredInvoices = () => {
    // Ensure invoices is an array before filtering
    if (!Array.isArray(invoices)) {
      console.error('Invoices is not an array:', invoices);
      return [];
    }
    
    if (filter === 'all') {
      return invoices;
    }
    
    return invoices.filter(invoice => invoice.status === filter);
  };

  const handleSendEmail = async (invoiceId) => {
    setProcessingInvoice(invoiceId);
    setError('');
    setSuccess('');
    
    try {
      await invoicesAPI.sendEmail(invoiceId);
      setSuccess(`Invoice email sent successfully.`);
      
      // Refresh data after a short delay
      setTimeout(() => {
        fetchData(craftsmanId);
      }, 1000);
    } catch (err) {
      console.error('Error sending invoice email:', err);
      setError('Failed to send invoice email. Please try again.');
    } finally {
      setProcessingInvoice(null);
    }
  };

  const handleDownloadPDF = async (invoiceId, invoiceNumber) => {
    setProcessingInvoice(invoiceId);
    setError('');
    
    try {
      const blob = await invoicesAPI.generatePDF(invoiceId);
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Invoice_${invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading invoice PDF:', err);
      setError('Failed to download invoice PDF. Please try again.');
    } finally {
      setProcessingInvoice(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#071a2b] to-[#132f4c]">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="bg-[#132f4c]/50 backdrop-blur-sm rounded-xl border border-white/10 shadow-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-0">Invoices</h1>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <div className="flex-grow">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-[#071a2b] text-white border border-white/10 focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                >
                  <option value="all">All Invoices</option>
                  <option value="pending">Pending Payment</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              
              <a
                href="/appointments"
                className="px-4 py-2 bg-[#071a2b] hover:bg-[#0a2540] text-white rounded-lg border border-white/10 transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Complete Appointment
              </a>
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
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00c2ff]"></div>
            </div>
          ) : getFilteredInvoices().length === 0 ? (
            <div className="bg-[#071a2b]/50 rounded-xl border border-white/10 p-8 text-center">
              <svg className="w-16 h-16 mx-auto text-white/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <h3 className="text-xl font-medium text-white mb-2">No Invoices Found</h3>
              <p className="text-white/70 mb-6">
                {filter === 'all' 
                  ? "You haven't created any invoices yet." 
                  : `You don't have any ${filter} invoices.`}
              </p>
              <a
                href="/appointments"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#0070f3] to-[#0050d3] text-white font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none transition-all duration-300"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Complete an Appointment
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-white/90">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left">Invoice #</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Due Date</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredInvoices().map((invoice) => (
                    <tr key={invoice.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4">
                        <a 
                          href={`/invoices/${invoice.id}`}
                          className="text-[#00c2ff] hover:text-white transition-colors"
                        >
                          {invoice.invoice_number}
                        </a>
                      </td>
                      <td className="px-4 py-4">
                        {customers[invoice.customer_id]?.name || 'Unknown Customer'}
                      </td>
                      <td className="px-4 py-4">
                        {formatDate(invoice.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        {formatDate(invoice.due_date)}
                      </td>
                      <td className="px-4 py-4 text-right font-medium">
                        {formatCurrency(invoice.total_amount)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(invoice.status)}`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleDownloadPDF(invoice.id, invoice.invoice_number)}
                            disabled={processingInvoice === invoice.id}
                            className="px-2 py-1 bg-[#071a2b] hover:bg-[#0a2540] text-white rounded text-xs font-medium transition-colors flex items-center"
                            title="Download PDF"
                          >
                            {processingInvoice === invoice.id ? (
                              <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
                              </svg>
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleSendEmail(invoice.id)}
                            disabled={processingInvoice === invoice.id}
                            className="px-2 py-1 bg-[#071a2b] hover:bg-[#0a2540] text-white rounded text-xs font-medium transition-colors flex items-center"
                            title="Send Email"
                          >
                            {processingInvoice === invoice.id ? (
                              <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                              </svg>
                            )}
                          </button>
                          
                          <a
                            href={`/invoices/${invoice.id}`}
                            className="px-2 py-1 bg-[#071a2b] hover:bg-[#0a2540] text-white rounded text-xs font-medium transition-colors flex items-center"
                            title="View Details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
