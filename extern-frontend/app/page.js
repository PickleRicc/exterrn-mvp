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
        // Add a small delay to ensure the token is properly set in localStorage
        // and the auth interceptor has time to set up
        setTimeout(() => {
          fetchCraftsmanData(tokenData.craftsmanId);
        }, 100);
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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
      <Header />
      <main className="flex-grow container mx-auto px-5 py-8 max-w-7xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64 my-8">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#00c2ff]"></div>
          </div>
        ) : !isLoggedIn ? (
          <div className="text-center py-16 animate-fade-in">
            <h1 className="text-4xl font-bold mb-6">
              <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">Welcome to ZIMMR</span>
            </h1>
            <p className="mb-8 text-white/80 text-lg max-w-2xl mx-auto">The platform for craftsmen in Germany to manage appointments and customers.</p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4 flex-wrap">
              <a 
                href="/auth/login" 
                className="px-8 py-4 bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none transition-all duration-300 transform hover:-translate-y-0.5 btn-glow"
              >
                Sign In
              </a>
              <a 
                href="/auth/register" 
                className="px-8 py-4 bg-white/10 hover:bg-white/15 text-white border border-white/20 font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none transition-all duration-300 transform hover:-translate-y-0.5"
              >
                Register
              </a>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-100/90 backdrop-blur-sm text-red-700 p-4 rounded-xl border border-red-200/50 shadow-lg animate-slide-up flex items-center">
            <svg className="w-5 h-5 mr-2 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>{error}</span>
          </div>
        ) : (
          <>
            <div className="mb-8 animate-fade-in">
              <h1 className="text-3xl font-bold mb-2">
                <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">
                  Welcome, {craftsman?.name || 'Craftsman'}
                </span>
              </h1>
              <p className="text-white/70">Here's an overview of your business</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-slide-up" style={{animationDelay: "0.1s"}}>
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 p-6 hover-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Your Stats</h2>
                  <div className="p-2 bg-[#0070f3]/20 rounded-full">
                    <svg className="w-6 h-6 text-[#0070f3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/60 text-sm mb-1">Customers</p>
                    <p className="text-2xl font-bold text-white">{customerCount}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/60 text-sm mb-1">Upcoming</p>
                    <p className="text-2xl font-bold text-white">{upcomingAppointments.length}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 col-span-2">
                    <p className="text-white/60 text-sm mb-1">Specialty</p>
                    <p className="text-xl font-bold text-white capitalize">{craftsman?.specialty || 'Not specified'}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 p-6 hover-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Upcoming Appointments</h2>
                  <div className="p-2 bg-[#7928ca]/20 rounded-full">
                    <svg className="w-6 h-6 text-[#7928ca]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                </div>
                
                {upcomingAppointments.length === 0 ? (
                  <div className="text-center py-6 text-white/60">
                    <svg className="w-12 h-12 mx-auto mb-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <p>No upcoming appointments</p>
                    <Link 
                      href="/appointments/new" 
                      className="inline-block mt-3 text-[#00c2ff] hover:text-white transition-colors"
                    >
                      Create your first appointment
                    </Link>
                  </div>
                ) : (
                  <ul className="space-y-4 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
                    {upcomingAppointments.map(appointment => (
                      <li key={appointment.id} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                        <div className="font-medium text-white">{formatDate(appointment.scheduled_at)}</div>
                        <div className="text-white/70 mt-1">{appointment.notes || 'No notes'}</div>
                        <div className="text-sm text-white/50 mt-1 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          {appointment.duration || 60} minutes
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-6 flex justify-between items-center">
                  <Link 
                    href="/appointments" 
                    className="text-[#00c2ff] hover:text-white text-sm md:text-base transition-colors flex items-center"
                  >
                    View all appointments
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                    </svg>
                  </Link>
                </div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 p-6 md:col-span-2 hover-card animate-slide-up" style={{animationDelay: "0.2s"}}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
                  <div className="p-2 bg-[#00c2ff]/20 rounded-full">
                    <svg className="w-6 h-6 text-[#00c2ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Link 
                    href="/appointments/new" 
                    className="bg-white/5 hover:bg-white/10 text-white p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-200 h-32"
                  >
                    <div className="p-3 bg-[#0070f3]/20 rounded-full mb-3">
                      <svg className="w-6 h-6 text-[#0070f3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                    </div>
                    <span className="font-medium">Create New Appointment</span>
                  </Link>
                  <Link 
                    href="/customers/new" 
                    className="bg-white/5 hover:bg-white/10 text-white p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-200 h-32"
                  >
                    <div className="p-3 bg-[#7928ca]/20 rounded-full mb-3">
                      <svg className="w-6 h-6 text-[#7928ca]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                      </svg>
                    </div>
                    <span className="font-medium">Add New Customer</span>
                  </Link>
                  <Link 
                    href="/onboarding" 
                    className="bg-white/5 hover:bg-white/10 text-white p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-200 h-32"
                  >
                    <div className="p-3 bg-[#00c2ff]/20 rounded-full mb-3">
                      <svg className="w-6 h-6 text-[#00c2ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <span className="font-medium">Update Availability Hours</span>
                  </Link>
                  <Link 
                    href="/customers" 
                    className="bg-white/5 hover:bg-white/10 text-white p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-200 h-32"
                  >
                    <div className="p-3 bg-[#0070f3]/20 rounded-full mb-3">
                      <svg className="w-6 h-6 text-[#0070f3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                      </svg>
                    </div>
                    <span className="font-medium">View All Customers</span>
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
