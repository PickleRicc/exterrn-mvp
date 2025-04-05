'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { appointmentsAPI, craftsmenAPI, customersAPI } from '../lib/api';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function AppointmentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState({});
  const [craftsmanId, setCraftsmanId] = useState(null);
  const [filter, setFilter] = useState('upcoming'); // upcoming, past, all
  
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
      // Fetch appointments
      const appointmentsData = await craftsmenAPI.getAppointments(craftsmanId);
      setAppointments(appointmentsData);
      
      // Fetch customers to display names
      const customersData = await customersAPI.getAll();
      const customersMap = {};
      customersData.forEach(customer => {
        customersMap[customer.id] = customer;
      });
      setCustomers(customersMap);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load appointments. Please try again.');
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFilteredAppointments = () => {
    const now = new Date();
    
    if (filter === 'upcoming') {
      return appointments
        .filter(apt => new Date(apt.scheduled_at) > now)
        .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    } else if (filter === 'past') {
      return appointments
        .filter(apt => new Date(apt.scheduled_at) <= now)
        .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));
    } else {
      return appointments.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a1929]">
      <Header />
      <main className="flex-grow container mx-auto p-4">
        <div className="bg-[#132f4c] rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">Appointments</h1>
            <a 
              href="/appointments/new" 
              className="px-4 py-2 bg-[#e91e63] text-white rounded hover:bg-[#c2185b]"
            >
              + New Appointment
            </a>
          </div>
          
          {error && (
            <div className="mb-6 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <div className="flex space-x-2 mb-4">
              <button 
                onClick={() => setFilter('upcoming')}
                className={`px-3 py-1 rounded ${filter === 'upcoming' 
                  ? 'bg-[#e91e63] text-white' 
                  : 'bg-[#1e3a5f] text-white'}`}
              >
                Upcoming
              </button>
              <button 
                onClick={() => setFilter('past')}
                className={`px-3 py-1 rounded ${filter === 'past' 
                  ? 'bg-[#e91e63] text-white' 
                  : 'bg-[#1e3a5f] text-white'}`}
              >
                Past
              </button>
              <button 
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded ${filter === 'all' 
                  ? 'bg-[#e91e63] text-white' 
                  : 'bg-[#1e3a5f] text-white'}`}
              >
                All
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e91e63]"></div>
            </div>
          ) : getFilteredAppointments().length === 0 ? (
            <div className="text-center py-12 text-white">
              <p className="text-lg">No {filter} appointments found</p>
              <p className="mt-2 text-gray-300">
                {filter === 'upcoming' 
                  ? 'Create a new appointment to get started' 
                  : 'Check other filters to see more appointments'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="px-4 py-2 text-left text-white">Date & Time</th>
                    <th className="px-4 py-2 text-left text-white">Customer</th>
                    <th className="px-4 py-2 text-left text-white">Duration</th>
                    <th className="px-4 py-2 text-left text-white">Status</th>
                    <th className="px-4 py-2 text-left text-white">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredAppointments().map(appointment => (
                    <tr key={appointment.id} className="border-b border-gray-600 hover:bg-[#1e3a5f]">
                      <td className="px-4 py-3 text-white">
                        {formatDate(appointment.scheduled_at)}
                      </td>
                      <td className="px-4 py-3 text-white">
                        {customers[appointment.customer_id]?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-white">
                        {appointment.duration || 60} min
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${getStatusClass(appointment.status)}`}>
                          {appointment.status || 'scheduled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white">
                        {appointment.notes || '-'}
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
