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
    <div className="min-h-screen flex flex-col bg-[#0a1929]">
      <Header />
      <main className="flex-grow container mx-auto p-4">
        <div className="bg-[#132f4c] rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">Customers</h1>
            <a 
              href="/customers/new" 
              className="px-4 py-2 bg-[#e91e63] text-white rounded hover:bg-[#c2185b]"
            >
              + New Customer
            </a>
          </div>
          
          {error && (
            <div className="mb-6 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search customers by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-gray-600 rounded bg-[#1e3a5f] text-white"
            />
          </div>
          
          {loading ? (
            <div className="text-center py-10">
              <p className="text-white">Loading customers...</p>
            </div>
          ) : error ? (
            <div className="mb-6 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          ) : getFilteredCustomers().length === 0 ? (
            <div className="text-center py-10">
              <p className="text-white">No customers found. Create your first customer using the "New Customer" button.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFilteredCustomers().map(customer => (
                <div key={customer.id} className="bg-[#1e3a5f] rounded-lg p-4 shadow">
                  <h3 className="font-bold text-lg text-white">{customer.name}</h3>
                  <div className="mt-2 space-y-1">
                    <p className="text-gray-300 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                      </svg>
                      {customer.phone}
                    </p>
                    {customer.email && (
                      <p className="text-gray-300 flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                        {customer.email}
                      </p>
                    )}
                    {customer.address && (
                      <p className="text-gray-300 flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        {customer.address}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex justify-between">
                    <a 
                      href={`/customers/${customer.id}`}
                      className="text-[#f48fb1] hover:text-[#e91e63] text-sm"
                    >
                      View Details
                    </a>
                    <a 
                      href={`/appointments/new?customer=${customer.id}`}
                      className="text-[#f48fb1] hover:text-[#e91e63] text-sm"
                    >
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
