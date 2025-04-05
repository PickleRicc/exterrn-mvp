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
    <div className="min-h-screen flex flex-col bg-[#0a1929]">
      <Header />
      <main className="flex-grow container mx-auto p-4">
        <div className="max-w-2xl mx-auto bg-[#132f4c] rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6 text-white">Add New Customer</h1>
          
          {error && (
            <div className="mb-6 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-3 bg-green-100 text-green-700 rounded">
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="name" className="block mb-2 text-sm font-medium text-white">
                Customer Name <span className="text-[#f48fb1]">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border border-gray-600 rounded bg-[#1e3a5f] text-white"
                placeholder="Full name"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="phone" className="block mb-2 text-sm font-medium text-white">
                Phone Number <span className="text-[#f48fb1]">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2 border border-gray-600 rounded bg-[#1e3a5f] text-white"
                placeholder="+49 123 456 7890"
                required
              />
              <p className="text-xs text-gray-300 mt-1">Include country code (e.g., +49 for Germany)</p>
            </div>
            
            <div className="mb-4">
              <label htmlFor="email" className="block mb-2 text-sm font-medium text-white">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border border-gray-600 rounded bg-[#1e3a5f] text-white"
                placeholder="customer@example.com"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="address" className="block mb-2 text-sm font-medium text-white">
                Address
              </label>
              <textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2 border border-gray-600 rounded bg-[#1e3a5f] text-white"
                rows="2"
                placeholder="Street, City, Postal Code"
              ></textarea>
            </div>
            
            <div className="mb-6">
              <label htmlFor="notes" className="block mb-2 text-sm font-medium text-white">
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2 border border-gray-600 rounded bg-[#1e3a5f] text-white"
                rows="3"
                placeholder="Additional information about the customer..."
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-600 rounded text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-[#e91e63] text-white rounded hover:bg-[#c2185b] disabled:bg-[#880e4f]"
              >
                {saving ? 'Adding...' : 'Add Customer'}
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
