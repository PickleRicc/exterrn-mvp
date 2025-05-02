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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
      <Header />
      <main className="flex-grow container mx-auto px-5 py-8">
        <div className="max-w-2xl mx-auto bg-[#132f4c]/70 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 md:p-8 animate-fade-in">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">
                  New Appointment
                </span>
              </h1>
              <p className="text-white">Schedule a new appointment with a customer</p>
            </div>
            <div className="p-2 bg-[#0070f3]/20 rounded-full">
              <svg className="w-6 h-6 text-[#0070f3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-100/90 backdrop-blur-sm text-red-700 rounded-xl border border-red-200/50 shadow-lg animate-slide-up">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-green-100/90 backdrop-blur-sm text-green-700 rounded-xl border border-green-200/50 shadow-lg animate-slide-up">
              {success}
            </div>
          )}
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="animate-spin h-12 w-12 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-white text-lg">Loading customers...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-5">
                <div className="relative">
                  <label htmlFor="customer" className="block mb-2 text-sm font-medium text-white">
                    Customer <span className="text-[#00c2ff]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                    </div>
                    <select
                      id="customer"
                      value={customerId}
                      onChange={handleCustomerChange}
                      className="w-full pl-10 p-3 border border-white/20 rounded-xl bg-white/10 text-gray-700 focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                    >
                      <option value="">Select a customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="relative">
                    <label htmlFor="scheduledAt" className="block mb-2 text-sm font-medium text-white">
                      Date <span className="text-[#00c2ff]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute top-3 left-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                      <input
                        id="scheduledAt"
                        type="date"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="w-full pl-10 p-3 border border-white/20 rounded-xl bg-white/10 text-gray-700 focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="relative">
                    <label htmlFor="scheduledTime" className="block mb-2 text-sm font-medium text-white">
                      Time <span className="text-[#00c2ff]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute top-3 left-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                      <input
                        id="scheduledTime"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full pl-10 p-3 border border-white/20 rounded-xl bg-white/10 text-gray-700 focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <label htmlFor="duration" className="block mb-2 text-sm font-medium text-white">
                    Duration (minutes)
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <select
                      id="duration"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full pl-10 p-3 border border-white/20 rounded-xl bg-white/10 text-gray-700 focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                    >
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="90">1.5 hours</option>
                      <option value="120">2 hours</option>
                      <option value="180">3 hours</option>
                      <option value="240">4 hours</option>
                    </select>
                  </div>
                </div>
                
                <div className="relative">
                  <label htmlFor="status" className="block mb-2 text-sm font-medium text-white">
                    Status
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full pl-10 p-3 border border-white/20 rounded-xl bg-white/10 text-gray-700 focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="location" className="block text-sm font-medium text-white">
                      Location <span className="text-[#00c2ff]">*</span>
                    </label>
                    {selectedCustomer?.address && (
                      <button 
                        type="button" 
                        onClick={handleToggleCustomLocation}
                        className="text-xs text-[#00c2ff] hover:text-[#00a0ff] transition-colors"
                      >
                        {showCustomLocation ? 'Use Customer Address' : 'Change Address'}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute top-3 left-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                    </div>
                    <input
                      id="location"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full pl-10 p-3 border border-white/20 rounded-xl bg-white/10 text-gray-700 focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                      placeholder="Customer's home, your workshop, etc."
                      disabled={selectedCustomer?.address && !showCustomLocation}
                    />
                  </div>
                </div>
                
                <div className="relative">
                  <label htmlFor="notes" className="block mb-2 text-sm font-medium text-white">
                    Notes
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                      <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                    </div>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full pl-10 p-3 border border-white/20 rounded-xl bg-white/10 text-gray-700 focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                      rows="3"
                      placeholder="Details about the appointment..."
                    ></textarea>
                  </div>
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
                  className="px-5 py-2.5 bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:transform-none"
                >
                  {saving ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
