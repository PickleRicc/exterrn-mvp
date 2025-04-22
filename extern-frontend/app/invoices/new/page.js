'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { invoicesAPI, appointmentsAPI, customersAPI } from '../../lib/api';
import { formatDate } from '@/lib/utils/dateUtils';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function NewInvoicePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [craftsmanId, setCraftsmanId] = useState(null);
  
  // Default to invoice type unless query param specifies quote
  const defaultType = searchParams.get('type') === 'quote' ? 'quote' : 'invoice';
  
  const [formData, setFormData] = useState({
    appointment_id: '',
    customer_id: '',
    craftsman_id: '',
    type: defaultType,
    status: 'draft',
    notes: '',
    due_date: '',
    service_date: '',
    location: '',
    vat_exempt: false,
    payment_deadline: '16 days'
  });
  
  // Line items state
  const [lineItems, setLineItems] = useState([
    { 
      description: '', 
      quantity: 1, 
      unit_price: 0, 
      tax_rate: 19,
      subtotal: 0
    }
  ]);
  
  // Calculated totals
  const [totals, setTotals] = useState({
    subtotal: 0,
    taxAmount: 0,
    total: 0
  });

  useEffect(() => {
    // Get craftsman ID from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        console.log('Token data for invoice creation:', tokenData);
        
        // Check for craftsmanId in different possible formats
        let extractedCraftsmanId = null;
        if (tokenData.craftsmanId) {
          extractedCraftsmanId = parseInt(tokenData.craftsmanId, 10);
        } else if (tokenData.craftsman_id) {
          extractedCraftsmanId = parseInt(tokenData.craftsman_id, 10);
        } else if (tokenData.user && tokenData.user.craftsmanId) {
          extractedCraftsmanId = parseInt(tokenData.user.craftsmanId, 10);
        } else if (tokenData.user && tokenData.user.craftsman_id) {
          extractedCraftsmanId = parseInt(tokenData.user.craftsman_id, 10);
        } else if (tokenData.id) {
          extractedCraftsmanId = parseInt(tokenData.id, 10);
        } else if (tokenData.userId) {
          extractedCraftsmanId = parseInt(tokenData.userId, 10);
        }
        
        console.log('Extracted craftsman ID for invoice creation:', extractedCraftsmanId);
        
        if (extractedCraftsmanId && !isNaN(extractedCraftsmanId)) {
          setCraftsmanId(extractedCraftsmanId);
          setFormData(prev => ({ ...prev, craftsman_id: extractedCraftsmanId }));
        } else {
          console.error('No valid craftsman ID found in token:', tokenData);
          setError('No valid craftsman ID found in your account. Please contact support.');
        }
      } catch (err) {
        console.error('Error parsing token:', err);
        setError('Error authenticating your account. Please try logging in again.');
      }
    } else {
      console.error('No token found in localStorage');
      setError('You are not logged in. Please log in to create invoices.');
      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
  }, []);

  useEffect(() => {
    if (craftsmanId) {
      fetchData();
    }
  }, [craftsmanId]);
  
  // Calculate totals whenever line items or VAT exemption changes
  useEffect(() => {
    calculateTotals();
  }, [lineItems, formData.vat_exempt]);

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
      // AND exclude rejected appointments
      const filteredAppointments = appointmentsData.filter(
        app => (app.status === 'completed' || app.status === 'scheduled') && 
               app.approval_status !== 'rejected'
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;
    
    if (name === 'appointment_id') {
      // When appointment is selected, auto-fill customer_id and location
      const selectedAppointment = appointments.find(a => a.id.toString() === value);
      if (selectedAppointment) {
        // Find the customer for this appointment
        const customer = customers.find(c => c.id === selectedAppointment.customer_id);
        
        setFormData({
          ...formData,
          [name]: value,
          customer_id: selectedAppointment.customer_id.toString(),
          // Pre-fill service date with appointment date if available
          service_date: selectedAppointment.scheduled_at ? 
            new Date(selectedAppointment.scheduled_at).toISOString().split('T')[0] : 
            formData.service_date,
          // Pre-fill location with customer address if available
          location: customer?.address || formData.location
        });
      } else {
        setFormData({
          ...formData,
          [name]: value
        });
      }
    } else if (name === 'customer_id') {
      // When customer is selected, auto-fill location if empty
      const selectedCustomer = customers.find(c => c.id.toString() === value);
      if (selectedCustomer && !formData.location) {
        setFormData({
          ...formData,
          [name]: value,
          location: selectedCustomer.address || ''
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
        [name]: finalValue
      });
    }
  };
  
  // Handle changes to line items
  const handleLineItemChange = (index, field, value) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    // Calculate subtotal for this line item
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? parseFloat(value) || 0 : parseFloat(updatedItems[index].quantity) || 0;
      const unitPrice = field === 'unit_price' ? parseFloat(value) || 0 : parseFloat(updatedItems[index].unit_price) || 0;
      updatedItems[index].subtotal = quantity * unitPrice;
    }
    
    setLineItems(updatedItems);
  };
  
  // Add a new line item
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { 
        description: '', 
        quantity: 1, 
        unit_price: 0, 
        tax_rate: 19,
        subtotal: 0
      }
    ]);
  };
  
  // Remove a line item
  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      const updatedItems = lineItems.filter((_, i) => i !== index);
      setLineItems(updatedItems);
    }
  };
  
  // Calculate totals
  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + (parseFloat(item.subtotal) || 0);
    }, 0);
    
    let taxAmount = 0;
    if (!formData.vat_exempt) {
      taxAmount = lineItems.reduce((sum, item) => {
        const itemSubtotal = parseFloat(item.subtotal) || 0;
        const taxRate = parseFloat(item.tax_rate) || 0;
        return sum + (itemSubtotal * taxRate / 100);
      }, 0);
    }
    
    const total = subtotal + taxAmount;
    
    setTotals({
      subtotal,
      taxAmount,
      total
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Validate required fields
      if (!formData.customer_id) {
        setError('Please select a customer');
        setSubmitting(false);
        return;
      }
      
      // Validate that at least one line item has a description and amount
      const hasValidLineItems = lineItems.some(item => 
        item.description.trim() && parseFloat(item.subtotal) > 0
      );
      
      if (!hasValidLineItems) {
        setError('Please add at least one item with a description and amount');
        setSubmitting(false);
        return;
      }
      
      // Double-check that craftsman_id is set and is a number
      if (!formData.craftsman_id || isNaN(parseInt(formData.craftsman_id, 10))) {
        // Try to get it from the token again
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const tokenData = JSON.parse(atob(token.split('.')[1]));
            if (tokenData.craftsmanId) {
              formData.craftsman_id = parseInt(tokenData.craftsmanId, 10);
            } else if (tokenData.id) {
              formData.craftsman_id = parseInt(tokenData.id, 10);
            } else if (tokenData.userId) {
              formData.craftsman_id = parseInt(tokenData.userId, 10);
            }
          } catch (err) {
            console.error('Error re-parsing token:', err);
          }
        }
        
        if (!formData.craftsman_id || isNaN(parseInt(formData.craftsman_id, 10))) {
          setError('Unable to determine a valid craftsman ID. Please contact support.');
          setSubmitting(false);
          return;
        }
      }
      
      // Ensure craftsman_id is an integer
      formData.craftsman_id = parseInt(formData.craftsman_id, 10);
      
      // Prepare the invoice data
      const invoiceData = {
        ...formData,
        items: lineItems.map(item => ({
          description: item.description,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          tax_rate: formData.vat_exempt ? 0 : parseFloat(item.tax_rate),
          amount: parseFloat(item.subtotal)
        }))
      };
      
      console.log('Submitting invoice data:', invoiceData);
      
      // Create the invoice
      const result = await invoicesAPI.create(invoiceData);
      console.log('Invoice created:', result);
      
      setSuccess(true);
      
      // Redirect to the invoice detail page after a short delay
      setTimeout(() => {
        if (result && result.id) {
          router.push(`/invoices/${result.id}`);
        } else {
          // If no ID is returned, just go back to the invoices list
          router.push('/invoices');
        }
      }, 1500);
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError('Failed to create invoice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Get the title based on document type
  const getDocumentTitle = () => {
    return formData.type === 'quote' ? 'New Quote' : 'New Invoice';
  };
  
  // Get the button text based on document type
  const getSubmitButtonText = () => {
    if (submitting) return 'Creating...';
    return formData.type === 'quote' ? 'Create Quote' : 'Create Invoice';
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
        <main className="container mx-auto px-5 py-8 max-w-7xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">
                {getDocumentTitle()}
              </span>
            </h1>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64 my-8">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#00c2ff]"></div>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl my-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          ) : success ? (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl my-4" role="alert">
              <span className="block sm:inline">
                {formData.type === 'quote' ? 'Quote' : 'Invoice'} created successfully! Redirecting...
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
              {/* Document Type Toggle */}
              <div className="mb-6">
                <label className="block text-white text-sm font-medium mb-2">
                  Document Type
                </label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="type"
                      value="invoice"
                      checked={formData.type === 'invoice'}
                      onChange={handleChange}
                      className="form-radio h-4 w-4 text-[#00c2ff]"
                    />
                    <span className="ml-2 text-white">Invoice</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="type"
                      value="quote"
                      checked={formData.type === 'quote'}
                      onChange={handleChange}
                      className="form-radio h-4 w-4 text-[#00c2ff]"
                    />
                    <span className="ml-2 text-white">Quote</span>
                  </label>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white text-sm font-medium mb-2" htmlFor="appointment_id">
                    Appointment
                  </label>
                  <select
                    id="appointment_id"
                    name="appointment_id"
                    value={formData.appointment_id}
                    onChange={handleChange}
                    className="bg-white/10 border border-white/20 text-white rounded-xl w-full py-2 px-3 focus:outline-none focus:border-[#00c2ff] transition-colors"
                  >
                    <option value="">Select an appointment (optional)</option>
                    {appointments.map(appointment => (
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
                  >
                    <option value="">Select a customer</option>
                    {customers.map(customer => (
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
                  <label className="block text-white text-sm font-medium mb-2" htmlFor="service_date">
                    Service Date
                  </label>
                  <input
                    id="service_date"
                    name="service_date"
                    type="date"
                    value={formData.service_date}
                    onChange={handleChange}
                    className="bg-white/10 border border-white/20 text-white rounded-xl w-full py-2 px-3 focus:outline-none focus:border-[#00c2ff] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2" htmlFor="location">
                    Service Location
                  </label>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Address where service was performed"
                    className="bg-white/10 border border-white/20 text-white rounded-xl w-full py-2 px-3 focus:outline-none focus:border-[#00c2ff] transition-colors"
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
                
                <div className="flex items-center">
                  <label className="flex items-center text-white text-sm font-medium">
                    <input
                      type="checkbox"
                      name="vat_exempt"
                      checked={formData.vat_exempt}
                      onChange={handleChange}
                      className="form-checkbox h-4 w-4 text-[#00c2ff] rounded"
                    />
                    <span className="ml-2">VAT Exempt (§19 UStG)</span>
                  </label>
                </div>
              </div>
              
              {/* Line Items Section */}
              <div className="mt-8 mb-6">
                <h3 className="text-white text-lg font-medium mb-4">Items</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-white">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 px-2">Description</th>
                        <th className="text-right py-2 px-2 w-20">Quantity</th>
                        <th className="text-right py-2 px-2 w-32">Unit Price (€)</th>
                        <th className="text-right py-2 px-2 w-24">Tax Rate (%)</th>
                        <th className="text-right py-2 px-2 w-32">Subtotal (€)</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, index) => (
                        <tr key={index} className="border-b border-white/10">
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                              placeholder="Item description"
                              className="bg-white/10 border border-white/20 text-white rounded-lg w-full py-1 px-2 focus:outline-none focus:border-[#00c2ff] transition-colors"
                              required
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                              className="bg-white/10 border border-white/20 text-white rounded-lg w-full py-1 px-2 focus:outline-none focus:border-[#00c2ff] transition-colors text-right"
                              required
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => handleLineItemChange(index, 'unit_price', e.target.value)}
                              className="bg-white/10 border border-white/20 text-white rounded-lg w-full py-1 px-2 focus:outline-none focus:border-[#00c2ff] transition-colors text-right"
                              required
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.tax_rate}
                              onChange={(e) => handleLineItemChange(index, 'tax_rate', e.target.value)}
                              className={`bg-white/10 border border-white/20 text-white rounded-lg w-full py-1 px-2 focus:outline-none focus:border-[#00c2ff] transition-colors text-right ${formData.vat_exempt ? 'opacity-50' : ''}`}
                              disabled={formData.vat_exempt}
                            />
                          </td>
                          <td className="py-2 px-2 text-right">
                            €{parseFloat(item.subtotal).toFixed(2)}
                          </td>
                          <td className="py-2 px-2">
                            <button
                              type="button"
                              onClick={() => removeLineItem(index)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              disabled={lineItems.length === 1}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <button
                  type="button"
                  onClick={addLineItem}
                  className="mt-4 bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center"
                >
                  <span className="mr-1">+</span> Add Item
                </button>
              </div>
              
              {/* Totals Section */}
              <div className="mt-8 flex justify-end">
                <div className="w-full md:w-64">
                  <div className="flex justify-between py-2 border-b border-white/10">
                    <span className="text-white">Subtotal:</span>
                    <span className="text-white">€{totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/10">
                    <span className="text-white">
                      {formData.vat_exempt ? 'VAT (Exempt):' : 'VAT (19%):'}
                    </span>
                    <span className="text-white">
                      {formData.vat_exempt ? 'Exempt' : `€${totals.taxAmount.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 font-bold">
                    <span className="text-white">Total:</span>
                    <span className="text-white">€{totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="col-span-1 md:col-span-2 mt-6">
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
                  placeholder="Additional notes for this document..."
                ></textarea>
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
                  {getSubmitButtonText()}
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
