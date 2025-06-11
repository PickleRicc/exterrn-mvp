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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#121212] to-[#1a1a1a]">
      <main className="flex-grow container mx-auto px-5 py-8 max-w-7xl overflow-hidden bg-gradient-to-b from-[#121212] to-[#1a1a1a]">
        {loading ? (
          <div className="flex items-center justify-center h-screen animate-fade-in">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ffcb00]"></div>
          </div>
        ) : !isLoggedIn ? (
          <div className="text-center py-16 animate-fade-in">
            <h1 className="text-4xl font-bold mb-6 font-heading">
              <span className="bg-gradient-to-r from-[#ffcb00] to-[#e6b800] bg-clip-text text-transparent">Willkommen bei ZIMMR</span>
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto mb-10">
              Die intelligente Plattform für Fliesenleger, um Termine, Kunden und Materialien zu verwalten.
            </p>
            <div className="flex gap-4 justify-center">
              <Link 
                href="/auth/login" 
                className="px-8 py-3 bg-[#ffcb00] hover:bg-[#e6b800] text-black font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none transition-all duration-300 transform hover:-translate-y-0.5"
              >
                Anmelden
              </Link>
              <Link 
                href="/auth/register" 
                className="px-8 py-3 bg-[#ffcb00] hover:bg-[#e6b800] text-black font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none transition-all duration-300 transform hover:-translate-y-0.5"
              >
                Registrieren
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8 animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    <span className="bg-gradient-to-r from-[#ffcb00] to-[#e6b800] bg-clip-text text-transparent">
                      {craftsman ? `Willkommen, ${craftsman.name}` : 'Willkommen'}
                    </span>
                  </h1>
                  <p className="text-white/70">
                    {craftsman ? `Fliesenleger` : 'Handwerker-Dashboard'}
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
                    <div className="p-3 bg-[#ffcb00]/20 rounded-full mr-4">
                      <svg className="w-6 h-6 text-[#ffcb00]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white">Kommende Termine</h2>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">{upcomingAppointments.length}</div>
                  <p className="text-white/60 mb-4">Geplante Fliesenprojekte</p>
                  <Link href="/appointments" className="text-[#ffcb00] hover:underline flex items-center text-sm">
                    Alle Termine anzeigen
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
                
                <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 transition-all duration-300 hover:bg-white/10">
                  <div className="flex items-center mb-4">
                    <div className="p-3 bg-[#ffcb00]/20 rounded-full mr-4">
                      <svg className="w-6 h-6 text-[#ffcb00]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white">Kunden</h2>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">{customerCount}</div>
                  <p className="text-white/60 mb-4">Aktive Kunden</p>
                  <Link href="/customers" className="text-[#ffcb00] hover:underline flex items-center text-sm">
                    Alle Kunden anzeigen
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
                
                <FinanceCard />
                
                <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 transition-all duration-300 hover:bg-white/10">
                  <div className="flex items-center mb-4">
                    <div className="p-3 bg-[#ffcb00]/20 rounded-full mr-4">
                      <svg className="w-6 h-6 text-[#ffcb00]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white">Rechnungen</h2>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">{invoiceCount}</div>
                  <p className="text-white/60 mb-4">Kundenrechnungen</p>
                  <Link href="/invoices" className="text-[#ffcb00] hover:underline flex items-center text-sm">
                    Alle Rechnungen anzeigen
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
              </div>
              
              <div className="mb-8">
                {/* Quick actions title section - currently disabled 
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-[#ffcb00]/20 rounded-full">
                    <svg className="w-6 h-6 text-[#ffcb00]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                  </div>
                </div>
                */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Link 
                    href="/appointments/new" 
                    className="bg-white/5 hover:bg-white/10 text-white p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-200 h-32"
                  >
                    <div className="p-3 bg-[#ffcb00]/20 rounded-full mb-3">
                      <svg className="w-6 h-6 text-[#ffcb00]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                    </div>
                    <span className="font-medium">Neuen Termin hinzufügen</span>
                  </Link>
                  <Link 
                    href="/time-tracking" 
                    className="bg-white/5 hover:bg-white/10 text-white p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-200 h-32"
                  >
                    <div className="p-3 bg-[#ffcb00]/20 rounded-full mb-3">
                      <svg className="w-6 h-6 text-[#ffcb00]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2"></path>
                      </svg>
                    </div>
                    <span className="font-medium">Zeiterfassung</span>
                  </Link>
                  <Link 
                    href="/customers/new" 
                    className="bg-white/5 hover:bg-white/10 text-white p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-200 h-32"
                  >
                    <div className="p-3 bg-[#ffcb00]/20 rounded-full mb-3">
                      <svg className="w-6 h-6 text-[#ffcb00]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 0112 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                      </svg>
                    </div>
                    <span className="font-medium">Neuen Kunden hinzufügen</span>
                  </Link>
                  <Link 
                    href="/materials/new" 
                    className="bg-white/5 hover:bg-white/10 text-white p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-200 h-32"
                  >
                    <div className="p-3 bg-[#ffcb00]/20 rounded-full mb-3">
                      <svg className="w-6 h-6 text-[#ffcb00]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4"></path>
                      </svg>
                    </div>
                    <span className="font-medium">Neues Fliesenmaterial hinzufügen</span>
                  </Link>
                  <Link 
                    href="/invoices/new" 
                    className="bg-white/5 hover:bg-white/10 text-white p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-200 h-32"
                  >
                    <div className="p-3 bg-[#ffcb00]/20 rounded-full mb-3">
                      <svg className="w-6 h-6 text-[#ffcb00]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                    </div>
                    <span className="font-medium">Neue Rechnung erstellen</span>
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