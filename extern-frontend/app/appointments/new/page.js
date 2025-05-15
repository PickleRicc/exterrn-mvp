'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { appointmentsAPI, customersAPI } from '../../lib/api';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function NewAppointmentPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [customers, setCustomers] = useState([]);
  const [craftsmanId, setCraftsmanId] = useState(null);
  
  // Form state
  const [customerId, setCustomerId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('scheduled');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomLocation, setShowCustomLocation] = useState(false);
  
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
        fetchCustomers();
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

  // Check for customer ID in URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined' && customers.length > 0) {
      // Parse URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const customerParam = urlParams.get('customer');
      
      if (customerParam) {
        // Set the customer ID from URL parameter
        setCustomerId(customerParam);
        
        // Fetch and set customer details
        const fetchCustomerDetails = async () => {
          try {
            const customerData = await customersAPI.getById(customerParam);
            setSelectedCustomer(customerData);
            
            // If customer has an address, set it as the location
            if (customerData.address) {
              setLocation(customerData.address);
              setShowCustomLocation(false);
            } else {
              setShowCustomLocation(true);
            }
          } catch (err) {
            console.error('Error fetching customer details from URL param:', err);
          }
        };
        
        fetchCustomerDetails();
      }
    }
  }, [customers]);

  const fetchCustomers = async () => {
    try {
      const data = await customersAPI.getAll();
      setCustomers(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers. Please try again.');
      setLoading(false);
    }
  };

  const handleCustomerChange = async (e) => {
    const selectedId = e.target.value;
    setCustomerId(selectedId);
    
    if (selectedId) {
      try {
        const customerData = await customersAPI.getById(selectedId);
        setSelectedCustomer(customerData);
        
        // If customer has an address, set it as the location
        if (customerData.address) {
          setLocation(customerData.address);
          setShowCustomLocation(false);
        } else {
          setShowCustomLocation(true);
        }
      } catch (err) {
        console.error('Error fetching customer details:', err);
      }
    } else {
      setSelectedCustomer(null);
      setLocation('');
      setShowCustomLocation(true);
    }
  };

  const handleToggleCustomLocation = () => {
    setShowCustomLocation(!showCustomLocation);
    if (!showCustomLocation && selectedCustomer?.address) {
      // Reset to customer's address when hiding custom location
      setLocation(selectedCustomer.address);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    // Validate required fields
    if (!customerId) {
      setError('Please select a customer');
      setSaving(false);
      return;
    }

    if (!scheduledAt || !scheduledTime) {
      setError('Please select a date and time');
      setSaving(false);
      return;
    }

    try {
      // Combine date and time
      const dateTime = new Date(`${scheduledAt}T${scheduledTime}`);
      
      // Create appointment
      await appointmentsAPI.create({
        customer_id: parseInt(customerId),
        craftsman_id: craftsmanId,
        scheduled_at: dateTime.toISOString(),
        notes,
        duration: parseInt(duration),
        location,
        status
      });

      setSuccess('Appointment created successfully!');
      
      // Clear form
      setCustomerId('');
      setScheduledAt('');
      setScheduledTime('');
      setNotes('');
      setDuration(60);
      setLocation('');
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/appointments');
      }, 2000);
    } catch (err) {
      console.error('Error creating appointment:', err);
      setError(err.response?.data?.error || 'Failed to create appointment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen text-white flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-5 py-8 min-h-screen bg-dark">
        <div className="max-w-2xl mx-auto bg-dark-lighter rounded-2xl shadow-xl p-6 md:p-8 animate-fade-in">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2 text-primary font-heading">
                New Appointment
              </h1>
              <p className="text-gray-400">Schedule a new appointment with a customer</p>
            </div>
            <div className="p-2 bg-primary/20 rounded-full">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-900/30 text-red-400 rounded-xl border border-red-800/50 shadow-lg animate-slide-up">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-green-900/30 text-green-400 rounded-xl border border-green-800/50 shadow-lg animate-slide-up">
              {success}
            </div>
          )}
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="animate-spin h-12 w-12 text-[#FFD200] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-300 text-lg">Loading customers...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-5">
                <div className="relative">
                  <label htmlFor="customer" className="block mb-2 text-sm font-medium text-gray-300">
                    Customer <span className="text-[#FFD200]">*</span>
                  </label>
                  <select
                    id="customer"
                    value={customerId}
                    onChange={handleCustomerChange}
                    className="w-full p-3 border border-gray-700 rounded-xl bg-gray-800 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  >
                    <option value="">Select a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="relative">
                    <label htmlFor="scheduledAt" className="block mb-2 text-sm font-medium text-gray-300">
                      Date <span className="text-[#FFD200]">*</span>
                    </label>
                    <input
                      id="scheduledAt"
                      type="date"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full p-3 border border-gray-700 rounded-xl bg-gray-800 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                      required
                    />
                  </div>
                  
                  <div className="relative">
                    <label htmlFor="scheduledTime" className="block mb-2 text-sm font-medium text-gray-300">
                      Time <span className="text-[#FFD200]">*</span>
                    </label>
                    <input
                      id="scheduledTime"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full p-3 border border-gray-700 rounded-xl bg-gray-800 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                      required
                    />
                  </div>
                </div>
                
                <div className="relative">
                  <label htmlFor="duration" className="block mb-2 text-sm font-medium text-gray-300">
                    Duration (minutes)
                  </label>
                  <select
                    id="duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full p-3 border border-gray-700 rounded-xl bg-gray-800 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  >
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                    <option value="180">3 hours</option>
                    <option value="240">4 hours</option>
                  </select>
                </div>
                
                <div className="relative">
                  <label htmlFor="status" className="block mb-2 text-sm font-medium text-gray-300">
                    Status
                  </label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full p-3 border border-gray-700 rounded-xl bg-gray-800 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div className="relative">
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="location" className="block text-sm font-medium text-white">
                      Location <span className="text-[#FFD200]">*</span>
                    </label>
                    {selectedCustomer?.address && (
                      <button 
                        type="button" 
                        onClick={handleToggleCustomLocation}
                        className="text-xs text-[#FFD200] hover:text-[#FFD200] transition-colors"
                      >
                        {showCustomLocation ? 'Use Customer Address' : 'Change Address'}
                      </button>
                    )}
                  </div>
                  <input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-3 border border-gray-700 rounded-xl bg-gray-800 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    placeholder="Customer's home, your workshop, etc."
                    disabled={selectedCustomer?.address && !showCustomLocation}
                  />
                </div>
                
                <div className="relative">
                  <label htmlFor="notes" className="block mb-2 text-sm font-medium text-gray-300">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 border border-gray-700 rounded-xl bg-gray-800 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    rows="3"
                    placeholder="Details about the appointment..."
                  ></textarea>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 pt-6 border-t border-white/20">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-5 py-2.5 border border-white/30 rounded-xl text-white hover:bg-white/10 transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 px-4 bg-[#ffcb00] hover:bg-[#ffcb00]/90 text-black font-semibold rounded-xl shadow-lg transform hover:scale-[1.01] transition-all flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {saving ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Creating Appointment...</span>
                    </div>
                  ) : (
                    'Create Appointment'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
