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
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [convertingQuote, setConvertingQuote] = useState(false);
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
      // Redirect to login page
      router.push('/login');
    }
  }, []);

  useEffect(() => {
    if (craftsmanId) {
      fetchInvoice();
    }
  }, [id, craftsmanId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const data = await invoicesAPI.getById(id, craftsmanId);
      console.log('Fetched invoice data:', data); // Debug log
      setInvoice(data);
      setError(null);
    } catch (err) {
      console.error(`Error fetching invoice ${id}:`, err);
      setError('Failed to load invoice. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdating(true);
      await invoicesAPI.update(id, { 
        status: newStatus,
        craftsman_id: craftsmanId
      });
      
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
      await invoicesAPI.delete(id, craftsmanId);
      
      // Redirect back to invoices list
      router.push('/invoices');
      
    } catch (err) {
      console.error(`Error deleting invoice:`, err);
      setError('Failed to delete invoice. Please try again.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleGeneratePdf = async () => {
    try {
      await invoicesAPI.generatePdf(id, craftsmanId);
    } catch (err) {
      console.error(`Error generating PDF:`, err);
      setError('Failed to generate PDF. Please try again.');
    }
  };

  const handlePreviewPdf = async () => {
    try {
      setPdfLoading(true);
      const response = await invoicesAPI.previewPdf(id, craftsmanId);
      
      if (response && response.pdfUrl) {
        setPdfPreviewUrl(response.pdfUrl);
        setShowPdfPreview(true);
      } else {
        setError('Failed to generate PDF preview.');
      }
    } catch (err) {
      console.error(`Error previewing PDF:`, err);
      setError('Failed to preview PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleConvertToInvoice = async () => {
    try {
      setConvertingQuote(true);
      const response = await invoicesAPI.convertQuoteToInvoice(id, craftsmanId);
      
      // Redirect to the new invoice
      if (response && response.id) {
        router.push(`/invoices/${response.id}`);
      } else {
        // If no new ID, just refresh the current page
        fetchInvoice();
        setConvertingQuote(false);
      }
    } catch (err) {
      console.error(`Error converting quote to invoice:`, err);
      setError('Failed to convert quote to invoice. Please try again.');
      setConvertingQuote(false);
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
      case 'draft':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getDocumentTypeBadgeClass = (type) => {
    switch (type) {
      case 'invoice':
        return 'bg-purple-500/20 text-purple-400';
      case 'quote':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Calculate totals from line items
  const calculateTotals = () => {
    if (!invoice || !invoice.items || invoice.items.length === 0) {
      return {
        subtotal: 0,
        taxAmount: 0,
        total: 0
      };
    }

    const subtotal = invoice.items.reduce((sum, item) => {
      return sum + (parseFloat(item.amount) || 0);
    }, 0);
    
    const taxAmount = invoice.items.reduce((sum, item) => {
      const itemAmount = parseFloat(item.amount) || 0;
      const taxRate = parseFloat(item.tax_rate) || 0;
      return sum + (itemAmount * taxRate / 100);
    }, 0);
    
    const total = subtotal + taxAmount;
    
    return {
      subtotal,
      taxAmount,
      total
    };
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
          <main className="container mx-auto px-5 py-8 max-w-7xl">
            <h1 className="text-3xl font-bold mb-6">
              <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">
                Loading...
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
                Error
              </span>
            </h1>
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl my-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
            <div className="mt-4">
              <Link
                href="/invoices"
                className="text-[#00c2ff] hover:text-[#0090ff] font-medium"
              >
                Back to Invoices
              </Link>
            </div>
          </main>
        </div>
        <Footer />
      </>
    );
  }

  if (!invoice) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
          <main className="container mx-auto px-5 py-8 max-w-7xl">
            <h1 className="text-3xl font-bold mb-6">
              <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">
                Invoice Not Found
              </span>
            </h1>
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-4 py-3 rounded-xl my-4" role="alert">
              <span className="block sm:inline">The requested invoice could not be found.</span>
            </div>
            <div className="mt-4">
              <Link
                href="/invoices"
                className="text-[#00c2ff] hover:text-[#0090ff] font-medium"
              >
                Back to Invoices
              </Link>
            </div>
          </main>
        </div>
        <Footer />
      </>
    );
  }

  // Calculate totals
  const totals = calculateTotals();
  const documentType = invoice.type === 'quote' ? 'Quote' : 'Invoice';
  const status = invoice.status || 'pending';
  const type = invoice.type || 'invoice';

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
        <main className="container mx-auto px-5 py-8 max-w-7xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">
                {documentType} Details
              </span>
            </h1>
            <Link 
              href="/invoices" 
              className="text-[#00c2ff] hover:text-[#0090ff] font-medium"
            >
              Back to Invoices
            </Link>
          </div>

          {/* PDF Preview Modal */}
          {showPdfPreview && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                  <h3 className="text-lg font-medium">PDF Preview</h3>
                  <button 
                    onClick={() => setShowPdfPreview(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {pdfPreviewUrl ? (
                    <iframe 
                      src={pdfPreviewUrl} 
                      className="w-full h-full border-0"
                      title="PDF Preview"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p>No preview available</p>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t flex justify-end">
                  <button
                    onClick={handleGeneratePdf}
                    className="px-4 py-2 bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <div className="px-6 py-5 border-b border-white/10">
              <div className="flex flex-wrap justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    {documentType} #{invoice.invoice_number || invoice.id || 'N/A'}
                  </h2>
                  <p className="text-white/70">
                    Created: {invoice.created_at ? formatDate(invoice.created_at) : 'N/A'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                  <span className={`px-3 py-1 rounded-xl text-sm font-medium ${getStatusBadgeClass(status)}`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                  <span className={`px-3 py-1 rounded-xl text-sm font-medium ${getDocumentTypeBadgeClass(type)}`}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-white/70 font-medium mb-2">Customer</h3>
                <p className="text-white font-semibold">{invoice.customer_name || 'N/A'}</p>
                <p className="text-white">{invoice.customer_email || 'N/A'}</p>
                <p className="text-white">{invoice.customer_phone || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-white/70 font-medium mb-2">Service Details</h3>
                {invoice.appointment_id && invoice.appointment_date && (
                  <p className="text-white">
                    Appointment: {formatDate(invoice.appointment_date)}
                  </p>
                )}
                {invoice.service_date && (
                  <p className="text-white">
                    Service Date: {formatDate(invoice.service_date)}
                  </p>
                )}
                {invoice.location && (
                  <p className="text-white">
                    Location: {invoice.location}
                  </p>
                )}
              </div>
            </div>

            {/* Line Items Section */}
            <div className="px-6 py-4">
              <h3 className="text-white/70 font-medium mb-4">Items</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-2">Description</th>
                      <th className="text-right py-2 px-2">Quantity</th>
                      <th className="text-right py-2 px-2">Unit Price (€)</th>
                      <th className="text-right py-2 px-2">Tax Rate (%)</th>
                      <th className="text-right py-2 px-2">Amount (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items && invoice.items.length > 0 ? (
                      invoice.items.map((item, index) => (
                        <tr key={index} className="border-b border-white/10">
                          <td className="py-2 px-2">{item.description || 'N/A'}</td>
                          <td className="py-2 px-2 text-right">{parseFloat(item.quantity || 0).toFixed(2)}</td>
                          <td className="py-2 px-2 text-right">€{parseFloat(item.unit_price || 0).toFixed(2)}</td>
                          <td className="py-2 px-2 text-right">
                            {invoice.vat_exempt ? 'Exempt' : `${parseFloat(item.tax_rate || 0).toFixed(2)}%`}
                          </td>
                          <td className="py-2 px-2 text-right">€{parseFloat(item.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="py-4 text-center text-white/50">No items found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Section */}
            <div className="px-6 py-4 flex justify-end">
              <div className="w-full md:w-64">
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-white">Subtotal:</span>
                  <span className="text-white">€{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-white">
                    {invoice.vat_exempt ? 'VAT (Exempt):' : 'VAT:'}
                  </span>
                  <span className="text-white">
                    {invoice.vat_exempt ? 'Exempt' : `€${totals.taxAmount.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between py-2 font-bold">
                  <span className="text-white">Total:</span>
                  <span className="text-white">€{totals.total.toFixed(2)}</span>
                </div>
                {invoice.due_date && (
                  <div className="flex justify-between py-2 text-white/70">
                    <span>Due Date:</span>
                    <span>{formatDate(invoice.due_date)}</span>
                  </div>
                )}
              </div>
            </div>

            {invoice.notes && (
              <div className="mb-6 px-6">
                <h3 className="text-white/70 font-medium mb-2">Notes</h3>
                <p className="text-white">{invoice.notes}</p>
              </div>
            )}

            {invoice.vat_exempt && (
              <div className="mb-6 px-6">
                <p className="text-white/70 text-sm italic">
                  This document is exempt from VAT according to §19 UStG (German Small Business Regulation).
                </p>
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
                <div className="flex flex-wrap gap-2 mb-4 sm:mb-0">
                  {/* Status change buttons */}
                  {type === 'invoice' && (
                    <>
                      <button
                        onClick={() => handleStatusChange('pending')}
                        disabled={status === 'pending' || updating}
                        className={`px-3 py-1 rounded-xl text-sm font-medium ${
                          status === 'pending' 
                            ? 'bg-yellow-500/20 text-yellow-400 cursor-not-allowed' 
                            : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                        }`}
                      >
                        Mark as Pending
                      </button>
                      <button
                        onClick={() => handleStatusChange('paid')}
                        disabled={status === 'paid' || updating}
                        className={`px-3 py-1 rounded-xl text-sm font-medium ${
                          status === 'paid' 
                            ? 'bg-green-500/20 text-green-400 cursor-not-allowed' 
                            : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        }`}
                      >
                        Mark as Paid
                      </button>
                      <button
                        onClick={() => handleStatusChange('overdue')}
                        disabled={status === 'overdue' || updating}
                        className={`px-3 py-1 rounded-xl text-sm font-medium ${
                          status === 'overdue' 
                            ? 'bg-red-500/20 text-red-400 cursor-not-allowed' 
                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        }`}
                      >
                        Mark as Overdue
                      </button>
                    </>
                  )}
                  
                  {/* Quote-specific buttons */}
                  {type === 'quote' && (
                    <button
                      onClick={handleConvertToInvoice}
                      disabled={convertingQuote}
                      className="px-3 py-1 rounded-xl text-sm font-medium bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                    >
                      {convertingQuote ? 'Converting...' : 'Convert to Invoice'}
                    </button>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {/* PDF buttons */}
                  <button
                    onClick={handlePreviewPdf}
                    disabled={pdfLoading}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
                  >
                    {pdfLoading ? 'Loading...' : 'Preview PDF'}
                  </button>
                  
                  <button
                    onClick={handleGeneratePdf}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
                  >
                    Download PDF
                  </button>
                  
                  <Link
                    href={`/invoices/${id}/edit`}
                    className="px-4 py-2 bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    Edit {documentType}
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
                    {confirmDelete ? 'Confirm Delete' : `Delete ${documentType}`}
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