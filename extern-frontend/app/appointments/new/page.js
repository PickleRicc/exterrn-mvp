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
    <div className="min-h-screen flex flex-col bg-[#0a1929]">
      <Header />
      <main className="flex-grow container mx-auto p-4">
        <div className="max-w-2xl mx-auto bg-[#132f4c] rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6 text-white">Create New Appointment</h1>
          
          {error && (
            <div className="mb-6 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-3 bg-green-100 text-green-700 rounded">
              {success}
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e91e63]"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="customerId" className="block mb-2 text-sm font-medium text-white">
                  Customer <span className="text-[#f48fb1]">*</span>
                </label>
                <select
                  id="customerId"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full p-2 border border-gray-600 rounded bg-[#1e3a5f] text-white"
                  required
                >
                  <option value="">Select a customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.phone})
                    </option>
                  ))}
                </select>
                <div className="mt-2">
                  <a 
                    href="/customers/new" 
                    className="text-[#f48fb1] hover:underline text-sm"
                  >
                    + Add new customer
                  </a>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="scheduledAt" className="block mb-2 text-sm font-medium text-white">
                    Date <span className="text-[#f48fb1]">*</span>
                  </label>
                  <input
                    id="scheduledAt"
                    type="date"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full p-2 border border-gray-600 rounded bg-[#1e3a5f] text-white"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="scheduledTime" className="block mb-2 text-sm font-medium text-white">
                    Time <span className="text-[#f48fb1]">*</span>
                  </label>
                  <input
                    id="scheduledTime"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full p-2 border border-gray-600 rounded bg-[#1e3a5f] text-white"
                    required
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="duration" className="block mb-2 text-sm font-medium text-white">
                  Duration (minutes)
                </label>
                <input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full p-2 border border-gray-600 rounded bg-[#1e3a5f] text-white"
                  min="15"
                  step="15"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="location" className="block mb-2 text-sm font-medium text-white">
                  Location
                </label>
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-2 border border-gray-600 rounded bg-[#1e3a5f] text-white"
                  placeholder="Customer's home, your workshop, etc."
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="notes" className="block mb-2 text-sm font-medium text-white">
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 border border-gray-600 rounded bg-[#1e3a5f] text-white"
                  rows="3"
                  placeholder="Details about the appointment..."
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 border border-gray-600 rounded text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#e91e63] text-white rounded hover:bg-[#c2185b] disabled:bg-[#880e4f]"
                >
                  {saving ? 'Creating...' : 'Create Appointment'}
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
