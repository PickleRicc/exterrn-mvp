'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { customersAPI, appointmentsAPI } from '../../lib/api';
import { quotesAPI } from '../../../lib/api/quotesAPI';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { generateInvoicePdf } from '../../../lib/utils/pdfGenerator';

export default function NewQuotePage() {
  // Format date for better readability in the dropdown
  const formatAppointmentDate = (dateString) => {
    if (!dateString) return 'No date';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if parsing fails
      
      // Format: DD.MM.YYYY HH:MM (German format)
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString; // Return original if any error occurs
    }
  };
  
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
    type: 'quote', // Default to quote type
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
  const [createdQuote, setCreatedQuote] = useState(null);
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
              console.log('Pre-populating quote from appointment data');
              
              // Get appointment data from URL parameters
              const appointmentId = urlParams.get('appointment_id');
              const customerId = urlParams.get('customer_id');
              const amount = urlParams.get('amount');
              const location = urlParams.get('location');
              const serviceDate = urlParams.get('service_date');
              const notes = urlParams.get('notes');
              
              // Calculate default due date (30 days from now for quotes)
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + 30);
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
                due_date: formattedDueDate,
                service_date: serviceDate || '',
                location: location || '',
                notes: notes || ''
              }));
            } else {
              // Set default due date to 30 days from today for quotes
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + 30);
              const formattedDueDate = dueDate.toISOString().split('T')[0];
              
              setFormData(prev => ({
                ...prev,
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
      setError('You are not logged in. Please log in to create quotes.');
      router.push('/auth/login');
    }
  }, [router]);

  const fetchCustomers = async (craftsmanId) => {
    try {
      setLoading(true);
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
      // Fetch all appointments for this craftsman without filtering by status or invoice association
      const data = await appointmentsAPI.getAll({ 
        craftsman_id: craftsmanId
      });
      console.log('Fetched appointments:', data);
      setAppointments(data);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      // Non-critical error, don't set error state to avoid blocking quote creation
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // For checkbox fields, use the checked property
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Special handling for amount to auto-calculate tax and total
    if (name === 'amount') {
      const amount = parseFloat(value) || 0;
      let taxAmount = 0;
      
      // Check if VAT exempt
      if (!formData.vat_exempt) {
        // Calculate tax as 19% of the amount
        taxAmount = amount * 0.19;
      }
      
      const totalAmount = amount + taxAmount;
      
      setFormData(prev => ({
        ...prev,
        tax_amount: taxAmount.toFixed(2),
        total_amount: totalAmount.toFixed(2)
      }));
    }
    
    // Special handling for vat_exempt to recalculate tax and total
    if (name === 'vat_exempt') {
      const amount = parseFloat(formData.amount) || 0;
      let taxAmount = 0;
      
      // Calculate tax only if not VAT exempt
      if (!checked) {
        taxAmount = amount * 0.19;
      }
      
      const totalAmount = amount + taxAmount;
      
      setFormData(prev => ({
        ...prev,
        tax_amount: taxAmount.toFixed(2),
        total_amount: totalAmount.toFixed(2)
      }));
    }
  };

  const handleAppointmentChange = (e) => {
    const appointmentId = e.target.value;
    
    // If no appointment is selected, do nothing
    if (!appointmentId) {
      setSelectedAppointment(null);
      return;
    }
    
    // Find the appointment in the list
    const appointment = appointments.find(app => app.id.toString() === appointmentId);
    if (appointment) {
      setSelectedAppointment(appointment);
      
      // Pre-fill form fields with appointment data
      const amount = appointment.price || 0;
      const taxAmount = formData.vat_exempt ? 0 : (amount * 0.19).toFixed(2);
      const totalAmount = (parseFloat(amount) + parseFloat(taxAmount)).toFixed(2);
      
      setFormData(prev => ({
        ...prev,
        appointment_id: appointmentId,
        customer_id: appointment.customer_id || prev.customer_id,
        amount: amount.toString(),
        tax_amount: taxAmount,
        total_amount: totalAmount,
        service_date: appointment.date || prev.service_date,
        location: appointment.location || prev.location,
        notes: `For service on ${appointment.date}: ${appointment.service_type || 'Service'}${prev.notes ? `\n\n${prev.notes}` : ''}`
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Ensure all required fields are filled
      const requiredFields = ['craftsman_id', 'customer_id', 'amount', 'total_amount'];
      for (const field of requiredFields) {
        if (!formData[field]) {
          setError(`${field.replace('_', ' ')} is required`);
          setSubmitting(false);
          return;
        }
      }
      
      console.log('Submitting quote data:', formData);
      
      // Create the quote
      const quote = await quotesAPI.create(formData);
      
      console.log('Quote created successfully:', quote);
      setCreatedQuote(quote);
      setSuccess(true);
      
      // Clear form data
      setFormData({
        craftsman_id: formData.craftsman_id, // Keep craftsman_id
        customer_id: '',
        amount: '',
        tax_amount: '',
        total_amount: '',
        notes: '',
        due_date: '',
        service_date: '',
        location: '',
        vat_exempt: false,
        type: 'quote',
        appointment_id: ''
      });
      
      // Redirect to quotes page after 2 seconds
      setTimeout(() => {
        router.push('/quotes');
      }, 2000);
    } catch (err) {
      console.error('Error creating quote:', err);
      setError('Failed to create quote. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!createdQuote) return;
    
    try {
      setPdfLoading(true);
      
      // Generate PDF for created quote
      await quotesAPI.generatePdf(createdQuote);
      
      console.log('PDF generated successfully');
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF. Please try again later.');
    } finally {
      setPdfLoading(false);
    }
  };
  
  const handleRedirectToQuotes = () => {
    router.push('/quotes');
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#0a1929] text-white p-6">
        <main className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Create New Quote</h1>
            <Link 
              href="/quotes" 
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg flex items-center transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              Back to Quotes
            </Link>
          </div>
          
          {error && (
            <div className="bg-red-900/20 border border-red-800 text-red-400 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-900/20 border border-green-800 text-green-400 p-4 rounded-lg mb-6 flex flex-col">
              <p className="mb-4">Quote created successfully!</p>
              <div className="flex space-x-4">
                <button 
                  onClick={handleGeneratePdf}
                  disabled={pdfLoading}
                  className={`px-4 py-2 ${pdfLoading ? 'bg-gray-700 cursor-not-allowed' : 'bg-[#e91e63] hover:bg-[#d81b60]'} text-white font-medium rounded-xl transition-colors`}
                >
                  {pdfLoading ? 'Generating PDF...' : 'Download PDF'}
                </button>
                <button 
                  onClick={handleRedirectToQuotes}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                >
                  View All Quotes
                </button>
              </div>
            </div>
          )}
          
          {!success && (
            <div className="bg-[#132f4c] rounded-lg p-6">
              <form onSubmit={handleSubmit}>
                {/* Select appointment (optional) */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-1">
                    Pre-fill from appointment (optional)
                  </label>
                  <select
                    name="appointment_id"
                    value={formData.appointment_id}
                    onChange={handleAppointmentChange}
                    className="w-full bg-[#1e3a5f] border border-[#2a4d76] rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                    disabled={loadingAppointments || success}
                  >
                    <option value="">Select an appointment...</option>
                    {loadingAppointments ? (
                      <option disabled>Loading appointments...</option>
                    ) : appointments.length > 0 ? (
                      appointments.map(appointment => (
                        <option key={appointment.id} value={appointment.id}>
                          {formatAppointmentDate(appointment.date)} | {appointment.customer_name || 'Customer'} | {appointment.service_type || 'Service'} {appointment.status ? `(${appointment.status})` : ''}
                        </option>
                      ))
                    ) : (
                      <option disabled>No appointments found</option>
                    )}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Customer *
                    </label>
                    <select
                      name="customer_id"
                      value={formData.customer_id}
                      onChange={handleChange}
                      className="w-full bg-[#1e3a5f] border border-[#2a4d76] rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                      required
                      disabled={loading || success}
                    >
                      <option value="">Select a customer...</option>
                      {loading ? (
                        <option disabled>Loading customers...</option>
                      ) : customers.length > 0 ? (
                        customers.map(customer => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name}
                          </option>
                        ))
                      ) : (
                        <option disabled>No customers found</option>
                      )}
                    </select>
                    <div className="text-xs text-gray-400 mt-1 flex justify-between">
                      <span>Required field</span>
                      <Link 
                        href="/customers/new" 
                        target="_blank"
                        className="text-[#e91e63] hover:text-[#f06292]"
                      >
                        Add New Customer
                      </Link>
                    </div>
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
                      className="w-full bg-[#1e3a5f] border border-[#2a4d76] rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                      disabled={success}
                    />
                  </div>
                  
                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Service Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full bg-[#1e3a5f] border border-[#2a4d76] rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                      placeholder="Customer's address or service location"
                      disabled={success}
                    />
                  </div>
                  
                  {/* VAT Exempt */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="vat_exempt"
                      id="vat_exempt"
                      checked={formData.vat_exempt}
                      onChange={handleChange}
                      className="w-4 h-4 bg-[#1e3a5f] border border-[#2a4d76] rounded focus:ring-[#e91e63] focus:ring-2"
                      disabled={success}
                    />
                    <label htmlFor="vat_exempt" className="ml-2 text-sm font-medium">
                      VAT Exempt
                    </label>
                  </div>
                  
                  {/* Amount (Net) */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Amount (Net) *
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className="w-full bg-[#1e3a5f] border border-[#2a4d76] rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                      required
                      disabled={success}
                    />
                  </div>
                  
                  {/* Tax Amount (calculated) */}
                  {!formData.vat_exempt && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Tax Amount (19% VAT)
                      </label>
                      <input
                        type="number"
                        name="tax_amount"
                        value={formData.tax_amount}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className="w-full bg-[#1e3a5f] border border-[#2a4d76] rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                        disabled={success}
                      />
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
                    <input
                      type="number"
                      name="total_amount"
                      value={formData.total_amount}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className="w-full bg-[#1e3a5f] border border-[#2a4d76] rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e91e63] bg-opacity-50"
                      required
                      readOnly
                      disabled={success}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Automatically calculated from amount + tax
                    </p>
                  </div>
                  
                  {/* Due Date */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Valid Until
                    </label>
                    <input
                      type="date"
                      name="due_date"
                      value={formData.due_date}
                      onChange={handleChange}
                      className="w-full bg-[#1e3a5f] border border-[#2a4d76] rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
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
                      className="w-full bg-[#1e3a5f] border border-[#2a4d76] rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                      disabled={success}
                    ></textarea>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <Link 
                    href="/quotes" 
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
                    {submitting ? 'Creating...' : 'Create Quote'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}
