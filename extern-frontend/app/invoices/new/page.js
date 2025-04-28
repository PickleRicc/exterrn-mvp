'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { invoicesAPI, customersAPI, appointmentsAPI } from '../../lib/api';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { generateInvoicePdf, generateSimpleInvoicePdf } from '../../../lib/utils/pdfGenerator';

export default function NewInvoicePage() {
  const [formData, setFormData] = useState({
    craftsman_id: '',
    customer_id: '',
    amount: '',
    tax_amount: '',
    total_amount: '',
    notes: '',
    due_date: '',
    service_date: '',
    location: '',
    vat_exempt: false,
    type: 'invoice',
    appointment_id: ''
  });
  
  const [customers, setCustomers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
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
          setFormData(prev => ({ ...prev, craftsman_id: String(extractedCraftsmanId) }));
          fetchCustomers(extractedCraftsmanId);
          fetchAppointments(extractedCraftsmanId);
          
          // Check URL for pre-populated data from appointment
          if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            
            if (urlParams.get('from_appointment') === 'true') {
              console.log('Pre-populating invoice from appointment data');
              
              // Get appointment data from URL parameters
              const appointmentId = urlParams.get('appointment_id');
              const customerId = urlParams.get('customer_id');
              const amount = urlParams.get('amount');
              const location = urlParams.get('location');
              const serviceDate = urlParams.get('service_date');
              const notes = urlParams.get('notes');
              
              // Calculate default due date (14 days from now)
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + 14);
              const formattedDueDate = dueDate.toISOString().split('T')[0];
              
              // Calculate tax (19% of amount)
              const amountValue = parseFloat(amount) || 0;
              const taxAmount = (amountValue * 0.19).toFixed(2);
              const totalAmount = (amountValue + parseFloat(taxAmount)).toFixed(2);
              
              // Update form data with appointment details
              setFormData(prev => ({
                ...prev,
                appointment_id: appointmentId || '',
                customer_id: customerId || '',
                amount: amount || '',
                tax_amount: taxAmount,
                total_amount: totalAmount,
                location: location || '',
                service_date: serviceDate || '',
                notes: notes || '',
                due_date: formattedDueDate
              }));
            }
          }
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
      setError('You are not logged in. Please log in to create invoices.');
    }
  }, []);

  const fetchCustomers = async (craftsmanId) => {
    try {
      setLoading(true);
      console.log('Fetching customers for craftsman ID:', craftsmanId);
      const data = await customersAPI.getAll({ craftsman_id: craftsmanId });
      console.log('Fetched customers:', data);
      setCustomers(data);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async (craftsmanId) => {
    try {
      setLoadingAppointments(true);
      console.log('Fetching appointments for craftsman ID:', craftsmanId);
      const data = await appointmentsAPI.getAll({ 
        craftsman_id: craftsmanId,
        // Only get completed appointments that don't have invoices yet
        status: 'completed',
        has_invoice: false
      });
      console.log('Fetched appointments:', data);
      setAppointments(data);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      // Don't set error here to avoid overriding customer fetch errors
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev };
      
      // Handle checkbox inputs
      if (type === 'checkbox') {
        newData[name] = checked;
        
        // If VAT exempt is checked, set tax_amount to 0
        if (name === 'vat_exempt' && checked) {
          newData.tax_amount = '0';
          
          // Recalculate total amount when VAT exempt is toggled
          const amount = parseFloat(newData.amount) || 0;
          newData.total_amount = amount.toFixed(2);
        } else if (name === 'vat_exempt' && !checked) {
          // If VAT exempt is unchecked, recalculate tax at 19%
          const amount = parseFloat(newData.amount) || 0;
          const taxAmount = amount * 0.19;
          newData.tax_amount = taxAmount.toFixed(2);
          newData.total_amount = (amount + taxAmount).toFixed(2);
        }
      } else {
        newData[name] = value;
      }
      
      // Auto-calculate tax and total amount when amount changes
      if (name === 'amount') {
        const amount = parseFloat(value) || 0;
        
        if (!newData.vat_exempt) {
          // Calculate 19% tax
          const taxAmount = amount * 0.19;
          newData.tax_amount = taxAmount.toFixed(2);
          newData.total_amount = (amount + taxAmount).toFixed(2);
        } else {
          // No tax for VAT exempt
          newData.tax_amount = '0';
          newData.total_amount = amount.toFixed(2);
        }
      } 
      // If tax_amount is manually changed, recalculate total
      else if (name === 'tax_amount') {
        const amount = parseFloat(newData.amount) || 0;
        const taxAmount = parseFloat(value) || 0;
        newData.total_amount = (amount + taxAmount).toFixed(2);
      }
      
      return newData;
    });
  };

  const handleAppointmentChange = (e) => {
    const appointmentId = e.target.value;
    
    if (!appointmentId) {
      setSelectedAppointment(null);
      return; // No appointment selected
    }
    
    // Find the selected appointment
    const selectedAppointment = appointments.find(
      appointment => appointment.id.toString() === appointmentId
    );
    
    if (!selectedAppointment) {
      setSelectedAppointment(null);
      return;
    }
    
    console.log('Selected appointment:', selectedAppointment);
    setSelectedAppointment(selectedAppointment);
    
    // Auto-populate invoice data from appointment
    setFormData(prev => ({
      ...prev,
      appointment_id: appointmentId,
      customer_id: selectedAppointment.customer_id.toString(),
      service_date: selectedAppointment.scheduled_at ? new Date(selectedAppointment.scheduled_at).toISOString().split('T')[0] : '',
      location: selectedAppointment.location || '',
      notes: selectedAppointment.notes || '',
      // Set default amount if needed
      // amount: '0', // You might want to set a default amount or leave it blank
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.customer_id) {
      setError('Please select a customer');
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Prepare data for submission
      const invoiceData = {
        ...formData,
        amount: parseFloat(formData.amount),
        tax_amount: parseFloat(formData.tax_amount) || 0,
        total_amount: parseFloat(formData.total_amount)
      };
      
      console.log('Submitting invoice data:', invoiceData);
      
      const result = await invoicesAPI.create(invoiceData);
      console.log('Invoice created:', result);
      
      setSuccess(true);
      setCreatedInvoice(result);
      
      // Don't redirect immediately to allow PDF generation
      
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError(err.response?.data?.error || 'Failed to create invoice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGeneratePdf = async () => {
    try {
      setPdfLoading(true);
      
      // Find the selected customer's details
      const selectedCustomer = customers.find(c => c.id === parseInt(formData.customer_id));
      
      // Create a temporary invoice object with form data
      const invoiceData = {
        ...createdInvoice,
        customer_name: selectedCustomer?.name || 'Customer',
        customer_email: selectedCustomer?.email || '',
        customer_phone: selectedCustomer?.phone || '',
        customer_address: selectedCustomer?.address || '',
        created_at: new Date().toISOString(),
        status: 'pending'
      };
      
      // Get craftsman data from localStorage if available
      const craftsmanData = {
        name: localStorage.getItem('userName') || 'ZIMMR Craftsman',
        email: localStorage.getItem('userEmail') || '',
        phone: '',
        address: ''
      };
      
      // Generate PDF directly
      await generateInvoicePdf(invoiceData, craftsmanData);
      
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again later.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleRedirectToInvoices = () => {
    router.push('/invoices');
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#0a1929] text-white">
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Link 
              href="/invoices" 
              className="text-[#e91e63] hover:text-[#d81b60] transition-colors"
            >
              &larr; Back to Invoices
            </Link>
            <h1 className="text-2xl font-bold mt-2">Create New Invoice</h1>
          </div>
          
          {error && (
            <div className="bg-red-500/20 text-red-400 p-4 rounded-xl mb-6">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-500/20 text-green-400 p-4 rounded-xl mb-6">
              <p className="mb-4">Invoice created successfully!</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleGeneratePdf}
                  disabled={pdfLoading}
                  className={`px-4 py-2 ${pdfLoading ? 'bg-gray-500 cursor-not-allowed' : 'bg-[#e91e63] hover:bg-[#d81b60] cursor-pointer'} text-white font-medium rounded-xl transition-colors flex items-center`}
                >
                  {pdfLoading ? (
                    <>
                      <span className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Generating PDF...
                    </>
                  ) : 'Download PDF'}
                </button>
                <button
                  onClick={handleRedirectToInvoices}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-medium rounded-xl transition-colors"
                >
                  View All Invoices
                </button>
              </div>
            </div>
          )}
          
          <div className={`bg-[#132f4c] rounded-xl p-6 shadow-lg ${success ? 'opacity-50' : ''}`}>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Selection */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Customer *
                  </label>
                  <select
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={handleChange}
                    className="w-full bg-white/10 text-white border border-white/10 rounded-xl px-4 py-2 appearance-none focus:ring-2 focus:ring-[#e91e63]/50 focus:border-[#e91e63]/50"
                    style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
                    required
                    disabled={success}
                  >
                    <option value="" className="text-black bg-white">Select a customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id} className="text-black bg-white">
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Appointment Selection */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Create from Appointment
                  </label>
                  <select
                    name="appointment_id"
                    value={formData.appointment_id}
                    onChange={handleAppointmentChange}
                    className="w-full bg-white/10 text-white border border-white/10 rounded-xl px-4 py-2 appearance-none focus:ring-2 focus:ring-[#e91e63]/50 focus:border-[#e91e63]/50"
                    style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
                    disabled={success || loadingAppointments}
                  >
                    <option value="" className="text-black bg-white">Select an appointment (optional)</option>
                    {loadingAppointments ? (
                      <option disabled className="text-black bg-white">Loading appointments...</option>
                    ) : appointments.length === 0 ? (
                      <option disabled className="text-black bg-white">No completed appointments found</option>
                    ) : (
                      appointments.map((appointment) => (
                        <option key={appointment.id} value={appointment.id} className="text-black bg-white">
                          {new Date(appointment.scheduled_at).toLocaleDateString()} - {appointment.customer_name} - {appointment.service_type || 'Service'}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Selecting an appointment will auto-fill customer and service details
                  </p>
                </div>
                
                {/* Selected Appointment Details */}
                {selectedAppointment && (
                  <div className="col-span-1 md:col-span-2 bg-[#132f4c] rounded-xl p-4 mb-4">
                    <h3 className="text-lg font-medium mb-2 text-[#e91e63]">
                      Selected Appointment Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium">Customer:</span>{' '}
                        {selectedAppointment.customer_name}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span>{' '}
                        {new Date(selectedAppointment.scheduled_at).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Time:</span>{' '}
                        {new Date(selectedAppointment.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      <div>
                        <span className="font-medium">Service:</span>{' '}
                        {selectedAppointment.service_type || 'General Service'}
                      </div>
                      {selectedAppointment.location && (
                        <div>
                          <span className="font-medium">Location:</span>{' '}
                          {selectedAppointment.location}
                        </div>
                      )}
                      {selectedAppointment.notes && (
                        <div className="col-span-1 md:col-span-2">
                          <span className="font-medium">Notes:</span>{' '}
                          {selectedAppointment.notes}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Invoice Type */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Document Type *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full bg-white/10 text-white border border-white/10 rounded-xl px-4 py-2 appearance-none focus:ring-2 focus:ring-[#e91e63]/50 focus:border-[#e91e63]/50"
                    style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
                    required
                    disabled={success}
                  >
                    <option value="invoice" className="text-black bg-white">Invoice</option>
                    <option value="quote" className="text-black bg-white">Quote</option>
                    <option value="draft" className="text-black bg-white">Draft</option>
                  </select>
                </div>
                
                {/* Service Date */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Service Date
                  </label>
                  <input
                    type="date"
                    name="service_date"
                    value={formData.service_date}
                    onChange={handleChange}
                    className="w-full bg-white/10 text-white border border-white/10 rounded-xl px-4 py-2 appearance-none focus:ring-2 focus:ring-[#e91e63]/50 focus:border-[#e91e63]/50"
                    style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
                    disabled={success}
                  />
                </div>
                
                {/* Service Location */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Service Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full bg-white/10 text-white border border-white/10 rounded-xl px-4 py-2 appearance-none focus:ring-2 focus:ring-[#e91e63]/50 focus:border-[#e91e63]/50"
                    placeholder="Location"
                    style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
                    disabled={success}
                  />
                </div>
                
                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Amount (Net) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className="w-full bg-white/10 text-white border border-white/10 rounded-xl px-4 py-2 appearance-none focus:ring-2 focus:ring-[#e91e63]/50 focus:border-[#e91e63]/50 pl-7"
                      placeholder="€"
                      style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
                      required
                      disabled={success}
                    />
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">€</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Net amount before tax
                  </p>
                </div>
                
                {/* VAT Exempt Toggle */}
                <div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="vat_exempt"
                      checked={formData.vat_exempt}
                      onChange={handleChange}
                      className="w-4 h-4 accent-[#e91e63]"
                      disabled={success}
                    />
                    <span className="text-sm font-medium">VAT Exempt</span>
                  </label>
                  <p className="text-xs text-gray-400 mt-1">
                    Check this if the service is exempt from VAT
                  </p>
                </div>
                
                {/* Tax Amount - Hidden if VAT exempt */}
                {!formData.vat_exempt && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Tax Amount (19% VAT)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="tax_amount"
                        value={formData.tax_amount}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className="w-full bg-white/10 text-white border border-white/10 rounded-xl px-4 py-2 appearance-none focus:ring-2 focus:ring-[#e91e63]/50 focus:border-[#e91e63]/50 pl-7"
                        placeholder="€"
                        style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
                        disabled={success}
                      />
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">€</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Automatically calculated as 19% of the amount
                    </p>
                  </div>
                )}
                
                {/* Total Amount (calculated) */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Total Amount (Gross) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="total_amount"
                      value={formData.total_amount}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className="w-full bg-white/10 text-white border border-white/10 rounded-xl px-4 py-2 appearance-none focus:ring-2 focus:ring-[#e91e63]/50 focus:border-[#e91e63]/50 pl-7 bg-opacity-50"
                      placeholder="€"
                      style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
                      required
                      readOnly
                      disabled={success}
                    />
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">€</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Automatically calculated from amount + tax
                  </p>
                </div>
                
                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleChange}
                    className="w-full bg-white/10 text-white border border-white/10 rounded-xl px-4 py-2 appearance-none focus:ring-2 focus:ring-[#e91e63]/50 focus:border-[#e91e63]/50"
                    style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
                    disabled={success}
                  />
                </div>
                
                {/* Notes */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="4"
                    className="w-full bg-white/10 text-white border border-white/10 rounded-xl px-4 py-2 appearance-none focus:ring-2 focus:ring-[#e91e63]/50 focus:border-[#e91e63]/50"
                    placeholder="Notes"
                    style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
                    disabled={success}
                  ></textarea>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Link 
                  href="/invoices" 
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors mr-3"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={submitting || success}
                  className={`px-4 py-2 bg-[#e91e63] hover:bg-[#d81b60] text-white font-medium rounded-xl transition-colors ${
                    (submitting || success) ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {submitting ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
