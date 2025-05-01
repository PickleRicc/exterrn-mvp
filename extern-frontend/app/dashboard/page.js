'use client';

import { useState, useEffect } from 'react';
import { appointmentsAPI, craftsmenAPI, customersAPI, invoicesAPI } from '../lib/api';
import Link from 'next/link';
import NextAppointment from '../components/NextAppointment';
import FinanceCard from './FinanceCard';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [craftsman, setCraftsman] = useState(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
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
        
        // Ensure appointmentsData is an array before using array methods
        if (Array.isArray(appointmentsData)) {
          // Sort appointments by date and take only future ones
          const now = new Date();
          const upcoming = appointmentsData
            .filter(apt => new Date(apt.scheduled_at) > now)
            .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
            .slice(0, 5); // Take only the next 5 appointments
          
          setUpcomingAppointments(upcoming);
        } else {
          // Log the actual data for debugging
          console.error('Appointments data is not an array:', appointmentsData);
          
          // If it's an empty object or has a data property that's an array, try to handle it
          if (appointmentsData && typeof appointmentsData === 'object') {
            if (Object.keys(appointmentsData).length === 0) {
              // Empty object - likely no appointments yet
              console.log('Empty appointments object received, treating as empty array');
              setUpcomingAppointments([]);
            } else if (appointmentsData.data && Array.isArray(appointmentsData.data)) {
              // Some APIs wrap arrays in a data property
              console.log('Using appointmentsData.data as the appointments array');
              const now = new Date();
              const upcoming = appointmentsData.data
                .filter(apt => new Date(apt.scheduled_at) > now)
                .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
                .slice(0, 5);
              setUpcomingAppointments(upcoming);
            } else {
              // Unknown format
              setUpcomingAppointments([]);
            }
          } else {
            setUpcomingAppointments([]);
          }
        }
      } catch (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
        // Don't set the main error - just handle appointments error gracefully
        setUpcomingAppointments([]);
      }
      
      try {
        // Fetch customer count with craftsman_id filter
        const customersData = await customersAPI.getAll({ craftsman_id: craftsmanId });
        setCustomerCount(Array.isArray(customersData) ? customersData.length : 0);
      } catch (customersError) {
        console.error('Error fetching customers:', customersError);
        // Don't set the main error - just handle customers error gracefully
        setCustomerCount(0);
      }

      try {
        // Fetch invoice count with craftsman_id filter
        const invoicesData = await invoicesAPI.getAll({ craftsman_id: craftsmanId });
        setInvoiceCount(Array.isArray(invoicesData) ? invoicesData.length : 0);
      } catch (invoicesError) {
        console.error('Error fetching invoices:', invoicesError);
        // Don't set the main error - just handle invoices error gracefully
        setInvoiceCount(0);
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
            <p className="text-xl text-white/80 max-w-3xl mx-auto mb-10">
              The smart platform for tilesmen to manage appointments, customers, and materials.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link 
                href="/auth/login" 
                className="px-8 py-3 bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none transition-all duration-300 transform hover:-translate-y-0.5"
              >
                Log In
              </Link>
              <Link 
                href="/auth/register" 
                className="px-8 py-3 border border-white/20 hover:bg-white/5 text-white font-medium rounded-xl focus:outline-none transition-all duration-300 transform hover:-translate-y-0.5"
              >
                Register
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8 animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">
                      {craftsman ? `Welcome, ${craftsman.name}` : 'Welcome'}
                    </span>
                  </h1>
                  <p className="text-white/70">
                    {craftsman ? `Tiling Professional` : 'Craftsman Dashboard'}
                  </p>
                  {/* Next Appointment Section */}
                  <div className="mt-8">
                    <NextAppointment appointment={upcomingAppointments && upcomingAppointments.length > 0 ? upcomingAppointments[0] : null} />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 transition-all duration-300 hover:bg-white/10">
                  <div className="flex items-center mb-4">
                    <div className="p-3 bg-[#0070f3]/20 rounded-full mr-4">
                      <svg className="w-6 h-6 text-[#0070f3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white">Upcoming Appointments</h2>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">{upcomingAppointments.length}</div>
                  <p className="text-white/60 mb-4">Scheduled tiling projects</p>
                  <Link href="/appointments" className="text-[#0070f3] hover:underline flex items-center text-sm">
                    View All Appointments
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
                
                <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 transition-all duration-300 hover:bg-white/10">
                  <div className="flex items-center mb-4">
                    <div className="p-3 bg-[#7928ca]/20 rounded-full mr-4">
                      <svg className="w-6 h-6 text-[#7928ca]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white">Customers</h2>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">{customerCount}</div>
                  <p className="text-white/60 mb-4">Active clients</p>
                  <Link href="/customers" className="text-[#7928ca] hover:underline flex items-center text-sm">
                    View All Customers
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
                
                <FinanceCard />
                
                <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 transition-all duration-300 hover:bg-white/10">
                  <div className="flex items-center mb-4">
                    <div className="p-3 bg-[#0070f3]/20 rounded-full mr-4">
                      <svg className="w-6 h-6 text-[#0070f3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white">Invoices</h2>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">{invoiceCount}</div>
                  <p className="text-white/60 mb-4">Client invoices</p>
                  <Link href="/invoices" className="text-[#0070f3] hover:underline flex items-center text-sm">
                    View All Invoices
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
              </div>
              
              {/* {upcomingAppointments.length > 0 && (
                <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 mb-8">
                  <div className="flex items-center mb-6">
                    <div className="p-3 bg-[#0070f3]/20 rounded-full mr-4">
                      <svg className="w-6 h-6 text-[#0070f3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white">Upcoming Tiling Projects</h2>
                  </div>
                  
                  <div className="space-y-4">
                    {upcomingAppointments.map((appointment) => (
                      <Link 
                        key={appointment.id}
                        href={`/appointments/${appointment.id}`}
                        className="block bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-all duration-200"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                          <div>
                            <h3 className="font-medium text-white">{appointment.customer_name || 'Customer'}</h3>
                            <p className="text-white/70 text-sm">{formatDate(appointment.scheduled_at)}</p>
                            {appointment.service_type && (
                              <span className="inline-block mt-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                                {appointment.service_type}
                              </span>
                            )}
                          </div>
                          <div className="mt-3 md:mt-0 flex items-center">
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              appointment.status === 'scheduled' ? 'bg-green-500/20 text-green-400' :
                              appointment.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </div>
                            <svg className="w-5 h-5 ml-2 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )} */}
              
              <div className="mb-8">
                {/* <div className="flex items-center mb-6">
                  <div className="p-2 bg-[#00c2ff]/20 rounded-full">
                    <svg className="w-6 h-6 text-[#00c2ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                  </div>
                </div> */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Link 
                    href="/appointments/new" 
                    className="bg-white/5 hover:bg-white/10 text-white p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-200 h-32"
                  >
                    {/* <div className="p-3 bg-[#0070f3]/20 rounded-full mb-3">
                      <svg className="w-6 h-6 text-[#0070f3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                    </div>
                    <span className="font-medium">Create New Tiling Project</span>
                  </Link>
                  <Link 
                    href="/customers/new" 
                    className="bg-white/5 hover:bg-white/10 text-white p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-200 h-32"
                  > */}
                    <div className="p-3 bg-[#7928ca]/20 rounded-full mb-3">
                      <svg className="w-6 h-6 text-[#7928ca]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                      </svg>
                    </div>
                    <span className="font-medium">Add New Customer</span>
                  </Link>
                  <Link 
                    href="/materials/new" 
                    className="bg-white/5 hover:bg-white/10 text-white p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-200 h-32"
                  >
                    <div className="p-3 bg-[#00c2ff]/20 rounded-full mb-3">
                      <svg className="w-6 h-6 text-[#00c2ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4"></path>
                      </svg>
                    </div>
                    <span className="font-medium">Add New Tiling Material</span>
                  </Link>
                  <Link 
                    href="/spaces/new" 
                    className="bg-white/5 hover:bg-white/10 text-white p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-200 h-32"
                  >
                    {/* <div className="p-3 bg-[#0070f3]/20 rounded-full mb-3">
                      <svg className="w-6 h-6 text-[#0070f3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                      </svg>
                    </div>
                    <span className="font-medium">Add New Customer Space</span>
                  </Link>
                  <Link 
                    href="/invoices/new" 
                    className="bg-white/5 hover:bg-white/10 text-white p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-200 h-32"
                  > */}
                    <div className="p-3 bg-[#7928ca]/20 rounded-full mb-3">
                      <svg className="w-6 h-6 text-[#7928ca]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                    </div>
                    <span className="font-medium">Create New Invoice</span>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}