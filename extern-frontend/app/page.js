'use client';

import { useState, useEffect } from 'react';
import { appointmentsAPI, craftsmenAPI, customersAPI } from './lib/api';
import Header from './components/Header';
import Footer from './components/Footer';
import Link from 'next/link';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [craftsman, setCraftsman] = useState(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    setIsLoggedIn(true);
    
    // Get craftsman ID from token
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      if (tokenData.craftsmanId) {
        fetchCraftsmanData(tokenData.craftsmanId);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error parsing token:', err);
      setLoading(false);
    }
  }, []);

  const fetchCraftsmanData = async (craftsmanId) => {
    try {
      // Fetch craftsman details
      const craftsmanData = await craftsmenAPI.getById(craftsmanId);
      setCraftsman(craftsmanData);
      
      try {
        // Fetch upcoming appointments
        const appointmentsData = await craftsmenAPI.getAppointments(craftsmanId);
        
        // Sort appointments by date and take only future ones
        const now = new Date();
        const upcoming = appointmentsData
          .filter(apt => new Date(apt.scheduled_at) > now)
          .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
          .slice(0, 5); // Take only the next 5 appointments
        
        setUpcomingAppointments(upcoming);
      } catch (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
        // Don't set the main error - just handle appointments error gracefully
        setUpcomingAppointments([]);
      }
      
      try {
        // Fetch customer count with craftsman_id filter
        const customersData = await customersAPI.getAll({ craftsman_id: craftsmanId });
        setCustomerCount(customersData.length);
      } catch (customersError) {
        console.error('Error fetching customers:', customersError);
        // Don't set the main error - just handle customers error gracefully
        setCustomerCount(0);
      }
    } catch (err) {
      console.error('Error fetching craftsman data:', err);
      setError('Failed to load your data. Please try again later.');
    } finally {
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

  return (
    <div className="min-h-screen flex flex-col bg-[#0a1929]">
      <Header />
      <main className="flex-grow container mx-auto px-5 py-8 max-w-7xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64 my-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e91e63]"></div>
          </div>
        ) : !isLoggedIn ? (
          <div className="text-center py-16">
            <h1 className="text-3xl font-bold mb-6 text-white">Welcome to ZIMMR</h1>
            <p className="mb-6 text-gray-300">The platform for craftsmen in Germany to manage appointments and customers.</p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4 flex-wrap">
              <a 
                href="/auth/login" 
                className="bg-[#e91e63] hover:bg-[#c2185b] text-white px-6 py-3 rounded-lg mr-4"
              >
                Login
              </a>
              <a 
                href="/auth/register" 
                className="bg-[#1e3a5f] hover:bg-[#2c5282] text-white px-6 py-3 rounded-lg"
              >
                Register
              </a>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 p-3 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}
            
            {craftsman && (
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-white">Welcome, {craftsman.name}</h1>
                <p className="text-gray-300">Specialty: {craftsman.specialty}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 mb-8 md:mb-10">
              <div className="bg-[#132f4c] p-6 md:p-8 rounded-lg shadow-md flex items-center">
                <div className="rounded-full bg-[#1e3a5f] p-3 mr-4">
                  <svg className="w-8 h-8 text-[#e91e63]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Upcoming Appointments</h2>
                  <p className="text-2xl font-bold text-[#f48fb1]">{upcomingAppointments.length}</p>
                </div>
              </div>
              
              <div className="bg-[#132f4c] p-6 md:p-8 rounded-lg shadow-md flex items-center">
                <div className="rounded-full bg-[#1e3a5f] p-3 mr-4">
                  <svg className="w-8 h-8 text-[#e91e63]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Total Customers</h2>
                  <p className="text-2xl font-bold text-[#f48fb1]">{customerCount}</p>
                </div>
              </div>
              
              <div className="bg-[#132f4c] p-6 md:p-8 rounded-lg shadow-md flex items-center">
                <div className="rounded-full bg-[#1e3a5f] p-3 mr-4">
                  <svg className="w-8 h-8 text-[#e91e63]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Working Hours</h2>
                  <Link href="/onboarding" className="text-[#f48fb1] hover:text-[#e91e63] text-sm">
                    Update Availability →
                  </Link>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-8">
              <div className="bg-[#132f4c] p-6 md:p-8 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 text-white">Upcoming Appointments</h2>
                {upcomingAppointments.length === 0 ? (
                  <p className="text-gray-300 italic py-4">No upcoming appointments</p>
                ) : (
                  <ul className="space-y-5">
                    {upcomingAppointments.map(appointment => (
                      <li key={appointment.id} className="border-b border-gray-600 pb-4">
                        <div className="font-medium text-white">{formatDate(appointment.scheduled_at)}</div>
                        <div className="text-gray-300">{appointment.notes || 'No notes'}</div>
                        <div className="text-sm text-gray-400">
                          Duration: {appointment.duration || 60} minutes
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-6 flex justify-between items-center">
                  <Link 
                    href="/appointments" 
                    className="text-[#f48fb1] hover:text-[#e91e63] text-sm md:text-base"
                  >
                    View all appointments →
                  </Link>
                </div>
              </div>
              
              <div className="bg-[#132f4c] p-6 md:p-8 rounded-lg shadow-md overflow-hidden">
                <h2 className="text-xl font-semibold mb-4 text-white">Quick Actions</h2>
                <div className="space-y-3 md:space-y-4">
                  <Link 
                    href="/appointments/new" 
                    className="flex items-center w-full bg-[#1e3a5f] hover:bg-[#2c5282] text-white p-3 md:p-4 rounded-md text-sm md:text-base"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    Create New Appointment
                  </Link>
                  <Link 
                    href="/customers/new" 
                    className="flex items-center w-full bg-[#1e3a5f] hover:bg-[#2c5282] text-white p-3 md:p-4 rounded-md text-sm md:text-base"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                    </svg>
                    Add New Customer
                  </Link>
                  <Link 
                    href="/onboarding" 
                    className="flex items-center w-full bg-[#1e3a5f] hover:bg-[#2c5282] text-white p-3 md:p-4 rounded-md text-sm md:text-base"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Update Availability Hours
                  </Link>
                  <Link 
                    href="/customers" 
                    className="flex items-center w-full bg-[#1e3a5f] hover:bg-[#2c5282] text-white p-3 md:p-4 rounded-md text-sm md:text-base"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                    View All Customers
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
