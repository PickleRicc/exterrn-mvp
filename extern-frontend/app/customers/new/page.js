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
  
  // Structured address fields
  const [title, setTitle] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isCompany, setIsCompany] = useState(false);
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  
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

  // Update the combined name and address fields when individual fields change
  useEffect(() => {
    // Combine name components
    let fullName = '';
    if (isCompany) {
      fullName = firstName.trim(); // Company name is stored in firstName
    } else {
      fullName = [
        title.trim(),
        firstName.trim(),
        lastName.trim()
      ].filter(Boolean).join(' ');
    }
    setName(fullName);
    
    // Combine address components
    let fullAddress = '';
    const addressLine1 = [street.trim(), houseNumber.trim()].filter(Boolean).join(' ');
    
    if (addressLine1) {
      fullAddress = addressLine1;
      
      if (addressLine2.trim()) {
        fullAddress += '\n' + addressLine2.trim();
      }
      
      const locationLine = [postalCode.trim(), city.trim()].filter(Boolean).join(' ');
      if (locationLine) {
        fullAddress += '\n' + locationLine;
      }
    }
    
    setAddress(fullAddress);
  }, [title, firstName, lastName, isCompany, street, houseNumber, addressLine2, postalCode, city]);

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
      setTitle('');
      setFirstName('');
      setLastName('');
      setIsCompany(false);
      setStreet('');
      setHouseNumber('');
      setAddressLine2('');
      setPostalCode('');
      setCity('');
      
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
            <button
              type="button"
              onClick={() => router.back()}
              className="text-white/70 hover:text-white flex items-center transition-colors"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Back
            </button>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-100/90 backdrop-blur-sm text-red-700 rounded-xl border border-red-200/50 shadow-lg animate-slide-up">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-green-100/90 backdrop-blur-sm text-green-700 rounded-xl border border-green-200/50 shadow-lg animate-slide-up">
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              {/* Customer Type Toggle */}
              <div className="flex items-center mb-4">
                <span className="text-sm font-medium text-white mr-4">Customer Type:</span>
                <div className="flex items-center space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-[#00c2ff]"
                      name="customerType"
                      checked={!isCompany}
                      onChange={() => setIsCompany(false)}
                    />
                    <span className="ml-2 text-white">Individual</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-[#00c2ff]"
                      name="customerType"
                      checked={isCompany}
                      onChange={() => setIsCompany(true)}
                    />
                    <span className="ml-2 text-white">Company</span>
                  </label>
                </div>
              </div>
              
              {/* Name Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {!isCompany && (
                  <div className="relative">
                    <label htmlFor="title" className="block mb-2 text-sm font-medium text-white">
                      Title/Salutation
                    </label>
                    <div className="relative">
                      <select
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                      >
                        <option value="">Select...</option>
                        <option value="Mr">Mr</option>
                        <option value="Mrs">Mrs</option>
                        <option value="Ms">Ms</option>
                        <option value="Mx">Mx</option>
                        <option value="Dr">Dr</option>
                      </select>
                    </div>
                  </div>
                )}
                
                <div className={`relative ${isCompany ? 'md:col-span-3' : 'md:col-span-2'}`}>
                  <label htmlFor="firstName" className="block mb-2 text-sm font-medium text-white">
                    {isCompany ? 'Company Name' : 'First Name'} {!isCompany && <span className="text-[#00c2ff]">*</span>}
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        {isCompany ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        )}
                      </svg>
                    </div>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full pl-10 p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                      placeholder={isCompany ? "Company name" : "First name"}
                      required
                    />
                  </div>
                </div>
                
                {!isCompany && (
                  <div className="relative">
                    <label htmlFor="lastName" className="block mb-2 text-sm font-medium text-white">
                      Last Name <span className="text-[#00c2ff]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                        placeholder="Last name"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="relative">
                <label htmlFor="phone" className="block mb-2 text-sm font-medium text-white">
                  Phone Number <span className="text-[#00c2ff]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                    </svg>
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                    placeholder="+49 123 456789"
                    required
                  />
                </div>
              </div>
              
              <div className="relative">
                <label htmlFor="email" className="block mb-2 text-sm font-medium text-white">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                    placeholder="example@email.com"
                  />
                </div>
              </div>
              
              {/* Address Section */}
              <div className="pt-4 border-t border-white/10">
                <h3 className="text-lg font-medium text-white mb-4">Address Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="relative">
                    <label htmlFor="street" className="block mb-2 text-sm font-medium text-white">
                      Street
                    </label>
                    <div className="relative">
                      <div className="absolute top-3 left-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                        </svg>
                      </div>
                      <input
                        id="street"
                        type="text"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        className="w-full pl-10 p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                        placeholder="Musterstraße"
                      />
                    </div>
                  </div>
                  
                  <div className="relative">
                    <label htmlFor="houseNumber" className="block mb-2 text-sm font-medium text-white">
                      House Number
                    </label>
                    <input
                      id="houseNumber"
                      type="text"
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(e.target.value)}
                      className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                      placeholder="12"
                    />
                  </div>
                </div>
                
                <div className="relative mb-4">
                  <label htmlFor="addressLine2" className="block mb-2 text-sm font-medium text-white">
                    Additional Address Information
                  </label>
                  <input
                    id="addressLine2"
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                    placeholder="Apartment, floor, c/o, etc."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label htmlFor="postalCode" className="block mb-2 text-sm font-medium text-white">
                      Postal Code
                    </label>
                    <input
                      id="postalCode"
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                      placeholder="12345"
                    />
                  </div>
                  
                  <div className="relative">
                    <label htmlFor="city" className="block mb-2 text-sm font-medium text-white">
                      City
                    </label>
                    <input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                      placeholder="Musterstadt"
                    />
                  </div>
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
                    className="w-full pl-10 p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                    rows="3"
                    placeholder="Additional information about the customer..."
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
