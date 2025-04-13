'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { invoicesAPI, appointmentsAPI, customersAPI } from '../../lib/api';
import { formatDate } from '@/lib/utils/dateUtils';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function NewInvoicePage() {
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [craftsmanId, setCraftsmanId] = useState(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    appointment_id: '',
    customer_id: '',
    craftsman_id: '',
    amount: '',
    tax_amount: '',
    notes: '',
    due_date: ''
  });

  useEffect(() => {
    // Get craftsman ID from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        if (tokenData.craftsmanId) {
          setCraftsmanId(tokenData.craftsmanId);
          setFormData(prev => ({ ...prev, craftsman_id: tokenData.craftsmanId }));
        }
      } catch (err) {
        console.error('Error parsing token:', err);
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Only proceed if we have a craftsman ID
        if (!craftsmanId) {
          setError('Craftsman ID not found. Please log in again.');
          setLoading(false);
          return;
        }
        
        // Fetch appointments and customers for this craftsman
        const filters = { craftsman_id: craftsmanId };
        
        console.log('Fetching data with filters:', filters);
        
        const [appointmentsData, customersData] = await Promise.all([
          appointmentsAPI.getAll(filters),
          customersAPI.getAll(filters)
        ]);
        
        console.log('Fetched appointments:', appointmentsData.length);
        console.log('Fetched customers:', customersData.length);
        
        // Filter to only show completed or scheduled appointments
        const filteredAppointments = appointmentsData.filter(
          app => app.status === 'completed' || app.status === 'scheduled'
        );
        
        setAppointments(filteredAppointments);
        setCustomers(customersData);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (craftsmanId) {
      fetchData();
    }
  }, [craftsmanId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'appointment_id') {
      // When appointment is selected, auto-fill customer_id
      const selectedAppointment = appointments.find(a => a.id.toString() === value);
      if (selectedAppointment) {
        setFormData({
          ...formData,
          [name]: value,
          customer_id: selectedAppointment.customer_id.toString()
        });
      } else {
        setFormData({
          ...formData,
          [name]: value
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Validate required fields
      if (!formData.appointment_id) {
        setError('Please select an appointment');
        setSubmitting(false);
        return;
      }
      
      if (!formData.customer_id) {
        setError('Please select a customer');
        setSubmitting(false);
        return;
      }
      
      if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
        setError('Please enter a valid amount');
        setSubmitting(false);
        return;
      }
      
      // Ensure craftsman_id is set
      if (!formData.craftsman_id) {
        setError('Craftsman ID is missing. Please refresh the page and try again.');
        setSubmitting(false);
        return;
      }
      
      // Calculate total amount
      const amount = parseFloat(formData.amount);
      const taxAmount = formData.tax_amount ? parseFloat(formData.tax_amount) : 0;
      const totalAmount = amount + taxAmount;
      
      // Prepare data for submission
      const invoiceData = {
        ...formData,
        amount: amount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status: 'pending'
      };
      
      console.log('Submitting invoice data:', invoiceData);
      
      // Submit to API
      const response = await invoicesAPI.create(invoiceData);
      console.log('Invoice created:', response);
      
      setSuccess(true);
      
      // Redirect to the invoice detail page
      router.push(`/invoices/${response.id}`);
      
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError('Failed to create invoice. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
        <main className="container mx-auto px-5 py-8 max-w-7xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">
                Create Invoice
              </span>
            </h1>
            <Link 
              href="/invoices" 
              className="text-[#00c2ff] hover:text-[#0090ff] font-medium"
            >
              Back to Invoices
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
          ) : (
            <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              {success && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl mb-4" role="alert">
                  <span className="block sm:inline">Invoice created successfully!</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white text-sm font-medium mb-2" htmlFor="appointment_id">
                    Appointment *
                  </label>
                  <select
                    id="appointment_id"
                    name="appointment_id"
                    value={formData.appointment_id}
                    onChange={handleChange}
                    className="bg-white/10 border border-white/20 text-white rounded-xl w-full py-2 px-3 focus:outline-none focus:border-[#00c2ff] transition-colors"
                    required
                  >
                    <option value="">Select an appointment</option>
                    {appointments.map((appointment) => (
                      <option key={appointment.id} value={appointment.id}>
                        {formatDate(appointment.scheduled_at)} - {appointment.customer_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2" htmlFor="customer_id">
                    Customer *
                  </label>
                  <select
                    id="customer_id"
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={handleChange}
                    className="bg-white/10 border border-white/20 text-white rounded-xl w-full py-2 px-3 focus:outline-none focus:border-[#00c2ff] transition-colors"
                    required
                    disabled={formData.appointment_id !== ''}
                  >
                    <option value="">Select a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </option>
                    ))}
                  </select>
                  {formData.appointment_id && (
                    <p className="text-sm text-white/50 mt-1">Customer auto-selected from appointment</p>
                  )}
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2" htmlFor="amount">
                    Amount (€) *
                  </label>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={handleChange}
                    className="bg-white/10 border border-white/20 text-white rounded-xl w-full py-2 px-3 focus:outline-none focus:border-[#00c2ff] transition-colors"
                    required
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2" htmlFor="tax_amount">
                    Tax Amount (€)
                  </label>
                  <input
                    id="tax_amount"
                    name="tax_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.tax_amount}
                    onChange={handleChange}
                    className="bg-white/10 border border-white/20 text-white rounded-xl w-full py-2 px-3 focus:outline-none focus:border-[#00c2ff] transition-colors"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2" htmlFor="due_date">
                    Due Date
                  </label>
                  <input
                    id="due_date"
                    name="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={handleChange}
                    className="bg-white/10 border border-white/20 text-white rounded-xl w-full py-2 px-3 focus:outline-none focus:border-[#00c2ff] transition-colors"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-white text-sm font-medium mb-2" htmlFor="notes">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="bg-white/10 border border-white/20 text-white rounded-xl w-full py-2 px-3 focus:outline-none focus:border-[#00c2ff] transition-colors"
                    rows="3"
                    placeholder="Additional notes for this invoice..."
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Link
                  href="/invoices"
                  className="bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-xl mr-2 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white font-medium py-2 px-4 rounded-xl focus:outline-none shadow-md hover:shadow-lg transition-all duration-300"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}
