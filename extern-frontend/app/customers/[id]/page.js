'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { customersAPI } from '../../lib/api';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function CustomerDetailsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [customer, setCustomer] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    service_type: ''
  });
  
  const router = useRouter();
  const [customerId, setCustomerId] = useState(null);

  useEffect(() => {
    // Extract customer ID from URL
    const pathSegments = window.location.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];
    setCustomerId(id);
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }
  }, [router]);

  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId]);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      const customerData = await customersAPI.getById(customerId);
      setCustomer(customerData);
      setFormData({
        name: customerData.name || '',
        email: customerData.email || '',
        phone: customerData.phone || '',
        address: customerData.address || '',
        service_type: customerData.service_type || ''
      });
    } catch (err) {
      setError('Failed to load customer data');
      console.error('Error fetching customer data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await customersAPI.update(customerId, formData);
      setSuccess('Customer updated successfully!');
      setEditMode(false);
      fetchCustomerData();
    } catch (err) {
      setError('Failed to update customer');
      console.error('Error updating customer:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
      <Header />
      <main className="flex-grow container mx-auto px-5 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <Link 
                href="/customers" 
                className="text-white/70 hover:text-white flex items-center mb-2 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Back to Customers
              </Link>
              <h1 className="text-3xl font-bold mb-2">
                <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">
                  {editMode ? 'Edit Customer' : (customer?.name || 'Customer Details')}
                </span>
              </h1>
            </div>
            {!editMode && customer && (
              <div className="mt-4 md:mt-0 flex space-x-3">
                <button 
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                  </svg>
                  Edit Customer
                </button>
              </div>
            )}
          </div>
          
          {error && (
            <div className="bg-red-100/20 backdrop-blur-sm text-red-500 p-4 rounded-xl mb-6">
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-100/20 backdrop-blur-sm text-green-500 p-4 rounded-xl mb-6 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p>{success}</p>
            </div>
          )}
          
          {loading && !customer ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-white/5 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10 mb-8">
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-[#00c2ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                      Customer Information
                    </h2>
                    
                    {editMode ? (
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-white/80 mb-1">
                            Full Name
                          </label>
                          <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            value={formData.name}
                            onChange={handleInputChange}
                            className="appearance-none relative block w-full px-3 py-2.5 border border-white/10 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-transparent sm:text-sm"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1">
                            Email Address
                          </label>
                          <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="appearance-none relative block w-full px-3 py-2.5 border border-white/10 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-transparent sm:text-sm"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-white/80 mb-1">
                            Phone Number
                          </label>
                          <input
                            id="phone"
                            name="phone"
                            type="tel"
                            required
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="appearance-none relative block w-full px-3 py-2.5 border border-white/10 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-transparent sm:text-sm"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="address" className="block text-sm font-medium text-white/80 mb-1">
                            Address
                          </label>
                          <textarea
                            id="address"
                            name="address"
                            rows="3"
                            value={formData.address}
                            onChange={handleInputChange}
                            className="appearance-none relative block w-full px-3 py-2.5 border border-white/10 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-transparent sm:text-sm"
                          ></textarea>
                        </div>
                        
                        <div>
                          <label htmlFor="service_type" className="block text-sm font-medium text-white/80 mb-1">
                            Service Type
                          </label>
                          <select
                            id="service_type"
                            name="service_type"
                            value={formData.service_type}
                            onChange={handleInputChange}
                            className="appearance-none relative block w-full px-3 py-2.5 border border-white/10 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-transparent sm:text-sm"
                          >
                            <option value="">Select service type</option>
                            <option value="Bathroom Tiling">Bathroom Tiling</option>
                            <option value="Kitchen Tiling">Kitchen Tiling</option>
                            <option value="Floor Tiling">Floor Tiling</option>
                            <option value="Wall Tiling">Wall Tiling</option>
                            <option value="Mosaic Tiling">Mosaic Tiling</option>
                            <option value="Complete Renovation">Complete Renovation</option>
                            <option value="Repair">Repair</option>
                            <option value="Consultation">Consultation</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        
                        <div className="flex space-x-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setEditMode(false)}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2.5 bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none transition-all duration-300"
                            disabled={loading}
                          >
                            {loading ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h3 className="text-sm font-medium text-white/60">Full Name</h3>
                            <p className="text-white">{customer?.name || 'N/A'}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-white/60">Phone Number</h3>
                            <p className="text-white">{customer?.phone || 'N/A'}</p>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-white/60">Email Address</h3>
                          <p className="text-white">{customer?.email || 'N/A'}</p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-white/60">Address</h3>
                          <p className="text-white whitespace-pre-line">{customer?.address || 'N/A'}</p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-white/60">Service Type</h3>
                          <p className="text-white">{customer?.service_type || 'N/A'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-1">
                <div className="bg-white/5 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10 mb-6">
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-[#00c2ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                      </svg>
                      Quick Actions
                    </h2>
                    
                    <div className="space-y-3">
                      <Link
                        href={`/spaces/new?customer_id=${customerId}`}
                        className="block w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2 text-[#00c2ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                        </svg>
                        Add New Space
                      </Link>
                      
                      <Link
                        href={`/appointments/new?customer_id=${customerId}`}
                        className="block w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2 text-[#00c2ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        Schedule Appointment
                      </Link>
                      
                      <Link
                        href={`/customers`}
                        className="block w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2 text-[#00c2ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                        </svg>
                        All Customers
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
