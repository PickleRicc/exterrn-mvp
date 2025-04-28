'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { customersAPI } from '../lib/api';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function CustomersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [craftsmanId, setCraftsmanId] = useState(null);
  
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

  useEffect(() => {
    if (craftsmanId) {
      fetchCustomers();
    }
  }, [craftsmanId]);

  const fetchCustomers = async () => {
    try {
      console.log('Fetching customers with craftsman_id:', craftsmanId);
      const data = await customersAPI.getAll({ craftsman_id: craftsmanId });
      console.log('Received customers:', data);
      setCustomers(data || []);  
      setLoading(false);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers. Please try again.');
      setLoading(false);
    }
  };

  const getFilteredCustomers = () => {
    if (!searchTerm) return customers;
    
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
      <Header />
      <main className="flex-grow container mx-auto px-5 py-8">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 p-6 md:p-8 animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">
                  Customers
                </span>
              </h1>
              <p className="text-white/70">Manage your customer database</p>
            </div>
            <a 
              href="/customers/new" 
              className="px-5 py-2.5 bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none transition-all duration-300 transform hover:-translate-y-0.5 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              New Customer
            </a>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-100/90 backdrop-blur-sm text-red-700 rounded-xl border border-red-200/50 shadow-lg animate-slide-up flex items-center">
              <svg className="w-5 h-5 mr-2 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>{error}</span>
            </div>
          )}
          
          <div className="mb-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search customers by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/10 text-white border border-white/10 rounded-xl px-4 py-2 appearance-none focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50"
              style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
            />
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#00c2ff]"></div>
            </div>
          ) : getFilteredCustomers().length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 animate-fade-in">
              <svg className="w-16 h-16 mx-auto mb-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
              <p className="text-xl font-medium text-white mb-2">No customers found</p>
              <p className="text-white/70 max-w-md mx-auto mb-6">
                Add your first customer to start building your client database
              </p>
              <a 
                href="/customers/new" 
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#0070f3] to-[#0050d3] text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Add Customer
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 animate-fade-in">
              {getFilteredCustomers().map(customer => (
                <div key={customer.id} className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/10">
                  <h3 className="font-bold text-lg text-white mb-3">{customer.name}</h3>
                  <div className="space-y-2">
                    <p className="text-white/80 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-[#00c2ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                      </svg>
                      {customer.phone}
                    </p>
                    {customer.email && (
                      <p className="text-white/80 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-[#7928ca]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        {customer.email}
                      </p>
                    )}
                    {customer.address && (
                      <p className="text-white/80 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-[#0070f3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        {customer.address}
                      </p>
                    )}
                  </div>
                  <div className="mt-5 flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
                    <a 
                      href={`/customers/${customer.id}`}
                      className="text-white/80 hover:text-[#00c2ff] transition-colors flex items-center justify-center sm:justify-start"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                      View Details
                    </a>
                    <a 
                      href={`/appointments/new?customer=${customer.id}`}
                      className="text-white/80 hover:text-[#00c2ff] transition-colors flex items-center justify-center sm:justify-start"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      Schedule Appointment
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
