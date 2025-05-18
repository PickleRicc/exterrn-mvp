'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { customersAPI } from '../lib/api';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function CustomersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [craftsmanId, setCraftsmanId] = useState(null);
  const [processingCustomer, setProcessingCustomer] = useState(null);
  
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

  // Handle customer deletion
  const handleDelete = async (customerId, customerName) => {
    if (!confirm(`Are you sure you want to delete ${customerName}? This will also delete all their appointments.`)) {
      return;
    }
    
    try {
      setProcessingCustomer(customerId);
      
      // Call API to delete the customer
      await customersAPI.delete(customerId);
      
      // Update the customers list
      setCustomers(customers.filter(customer => customer.id !== customerId));
      
      // Show success message
      setSuccess(`Customer ${customerName} has been deleted successfully.`);
      
      // Hide success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error deleting customer:', err);
      setError(err.response?.data?.error || 'Failed to delete customer. Please try again.');
      
      // Hide error message after 5 seconds
      setTimeout(() => setError(''), 5000);
    } finally {
      setProcessingCustomer(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#121212] to-[#1a1a1a]">
      <Header title="Kunden" />
      <main className="flex-grow container mx-auto px-4 py-6 sm:px-6 md:py-8">
        {error && (
          <div className="bg-red-100/10 border border-red-200/20 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100/10 border border-green-200/20 text-green-400 p-4 rounded-lg mb-6">
            {success}
          </div>
        )}
        
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 transition-all duration-300 hover:bg-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold text-white">
              Kunden
            </h1>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Kunden suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ffcb00]/30 focus:border-[#ffcb00]/30"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
              </div>
              
              <a 
                href="/customers/new" 
                className="bg-[#ffcb00] hover:bg-[#e6b800] text-black px-4 py-2 rounded-lg shadow text-sm font-medium flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Neuer Kunde
              </a>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center mt-8 mb-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffcb00]"></div>
            </div>
          ) : getFilteredCustomers().length === 0 ? (
            <div className="text-center py-12">
              {searchTerm ? (
                <div>
                  <p className="text-white/70 text-lg mb-2">Keine Kunden gefunden für "{searchTerm}"</p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-[#ffcb00] hover:underline"
                  >
                    Suche löschen
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-white/70 text-lg mb-4">Sie haben noch keine Kunden</p>
                  <a
                    href="/customers/new"
                    className="bg-[#ffcb00] hover:bg-[#e6b800] text-black px-4 py-2 rounded-lg shadow text-sm font-medium inline-flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    Ersten Kunden hinzufügen
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFilteredCustomers().map(customer => (
                <div key={customer.id} className="bg-white/5 rounded-lg p-5 border border-white/10 transition-all hover:bg-white/10">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-12 h-12 bg-[#ffcb00]/20 rounded-full flex items-center justify-center text-[#ffcb00] text-xl font-bold">
                      {customer.name ? customer.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="ml-4 flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-xl mb-1 truncate">{customer.name}</h3>
                      <p className="text-white/60 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-[#ffcb00]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                        </svg>
                        {customer.phone}
                      </p>
                      {customer.email && (
                        <p className="text-white/60 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-[#ffcb00]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                          {customer.email}
                        </p>
                      )}
                      {customer.address && (
                        <p className="text-white/60 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-[#ffcb00]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          </svg>
                          {customer.address}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-5 flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
                    <a 
                      href={`/customers/${customer.id}`}
                      className="text-[#ffcb00] hover:text-white transition-colors flex items-center justify-center sm:justify-start"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                      Details anzeigen
                    </a>
                    <a 
                      href={`/appointments/new?customer=${customer.id}`}
                      className="text-[#ffcb00] hover:text-white transition-colors flex items-center justify-center sm:justify-start"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      Termin vereinbaren
                    </a>
                    <button 
                      onClick={() => handleDelete(customer.id, customer.name)}
                      disabled={processingCustomer === customer.id}
                      className="text-red-400 hover:text-red-300 transition-colors flex items-center justify-center sm:justify-start"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                      {processingCustomer === customer.id ? 'Löschen...' : 'Löschen'}
                    </button>
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
