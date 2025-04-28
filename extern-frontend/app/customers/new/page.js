'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { customersAPI } from '../../lib/api';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function NewCustomerPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [craftsmanId, setCraftsmanId] = useState(null);
  
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  
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
      }
    } catch (err) {
      console.error('Error parsing token:', err);
      setError('Session error. Please log in again.');
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    // Validate required fields
    if (!name) {
      setError('Customer name is required');
      setSaving(false);
      return;
    }

    if (!phone) {
      setError('Phone number is required');
      setSaving(false);
      return;
    }

    try {
      // Get craftsman ID from token
      const token = localStorage.getItem('token');
      let craftsmanId = null;
      
      if (token) {
        try {
          const tokenData = JSON.parse(atob(token.split('.')[1]));
          if (tokenData.craftsmanId) {
            craftsmanId = tokenData.craftsmanId;
          }
        } catch (err) {
          console.error('Error parsing token:', err);
        }
      }
      
      if (!craftsmanId) {
        setError('Unable to determine your craftsman ID. Please log out and log in again.');
        setSaving(false);
        return;
      }

      // Include craftsman_id in the customer data
      const customerData = {
        name,
        phone,
        email: email || null,
        address: address || null,
        notes: notes || null,
        craftsman_id: craftsmanId
      };

      await customersAPI.create(customerData);
      setSuccess('Customer added successfully!');
      
      // Clear form
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setNotes('');
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/customers');
      }, 2000);
    } catch (err) {
      console.error('Error creating customer:', err);
      setError(err.response?.data?.error || 'Failed to add customer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
      <Header />
      <main className="flex-grow container mx-auto px-5 py-8">
        <div className="max-w-2xl mx-auto bg-white/5 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 p-6 md:p-8 animate-fade-in">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">
                  Add New Customer
                </span>
              </h1>
              <p className="text-white/70">Create a new customer profile</p>
            </div>
            <div className="p-2 bg-[#0070f3]/20 rounded-full">
              <svg className="w-6 h-6 text-[#0070f3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
              </svg>
            </div>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-100/90 backdrop-blur-sm text-red-700 rounded-xl border border-red-200/50 shadow-lg animate-slide-up flex items-center">
              <svg className="w-5 h-5 mr-2 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-green-100/90 backdrop-blur-sm text-green-700 rounded-xl border border-green-200/50 shadow-lg animate-slide-up flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>{success}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="relative">
                <label htmlFor="name" className="block mb-2 text-sm font-medium text-white">
                  Customer Name <span className="text-[#00c2ff]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 p-3 border border-white/10 rounded-xl bg-white/10 text-white placeholder-white/70 appearance-none focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                    placeholder="Customer Name"
                    style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
                  />
                </div>
              </div>
              
              <div className="relative">
                <label htmlFor="phone" className="block mb-2 text-sm font-medium text-white">
                  Phone Number <span className="text-[#00c2ff]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                    </svg>
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 p-3 border border-white/10 rounded-xl bg-white/10 text-white placeholder-white/70 appearance-none focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                    placeholder="Phone Number"
                    style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
                  />
                </div>
                <p className="text-xs text-white/60 mt-1.5">Include country code (e.g., +49 for Germany)</p>
              </div>
              
              <div className="relative">
                <label htmlFor="email" className="block mb-2 text-sm font-medium text-white">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 p-3 border border-white/10 rounded-xl bg-white/10 text-white placeholder-white/70 appearance-none focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                    placeholder="Email (optional)"
                    style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
                  />
                </div>
              </div>
              
              <div className="relative">
                <label htmlFor="address" className="block mb-2 text-sm font-medium text-white">
                  Address
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                    <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                  </div>
                  <textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-10 p-3 border border-white/10 rounded-xl bg-white/10 text-white placeholder-white/70 appearance-none focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                    rows="2"
                    placeholder="Street, City, Postal Code"
                    style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
                  ></textarea>
                </div>
              </div>
              
              <div className="relative">
                <label htmlFor="notes" className="block mb-2 text-sm font-medium text-white">
                  Notes
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                    <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                  </div>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full pl-10 p-3 border border-white/10 rounded-xl bg-white/10 text-white placeholder-white/70 appearance-none focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                    rows="3"
                    placeholder="Additional information about the customer..."
                    style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
                  ></textarea>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-2.5 border border-white/20 rounded-xl text-white hover:bg-white/5 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:transform-none"
              >
                {saving ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Adding Customer...</span>
                  </div>
                ) : (
                  'Add Customer'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
