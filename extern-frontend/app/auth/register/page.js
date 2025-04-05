'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '../../lib/api';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('craftsman');
  const [name, setName] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate required fields
    if (!firstName || !lastName) {
      setError('First and last name are required');
      return;
    }

    if (!phone) {
      setError('Phone number is required');
      return;
    }

    if (!specialty) {
      setError('Specialty is required');
      return;
    }

    setLoading(true);

    try {
      // Generate username from first and last name
      const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
      // Full name for display
      const fullName = `${firstName} ${lastName}`;
      
      // Register as craftsman or customer
      await authAPI.register(username, email, password, role, phone, specialty, fullName, name);
      
      // Redirect to login page after successful registration
      router.push('/auth/login?registered=true');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a1929] px-5 py-10 overflow-hidden">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">ZIMMR</h1>
          <p className="text-gray-300 text-lg">Create your account</p>
        </div>
        
        <div className="bg-[#132f4c] rounded-lg shadow-lg p-6 md:p-8 overflow-hidden">
          {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col space-y-2">
                <label htmlFor="firstName" className="text-sm font-medium text-white">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="px-4 py-3 bg-[#1e3a5f] border border-[#2c5282] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                  required
                />
              </div>
              
              <div className="flex flex-col space-y-2">
                <label htmlFor="lastName" className="text-sm font-medium text-white">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="px-4 py-3 bg-[#1e3a5f] border border-[#2c5282] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                  required
                />
              </div>
            </div>
            
            <div className="flex flex-col space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-white">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-4 py-3 bg-[#1e3a5f] border border-[#2c5282] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                required
              />
            </div>
            
            <div className="flex flex-col space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-white">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-4 py-3 bg-[#1e3a5f] border border-[#2c5282] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                required
              />
            </div>
            
            <div className="flex flex-col space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-white">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="px-4 py-3 bg-[#1e3a5f] border border-[#2c5282] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                required
              />
            </div>
            
            <div className="flex flex-col space-y-2 pt-2">
              <label className="text-sm font-medium text-white mb-1">Role</label>
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className={`flex items-center justify-center p-4 rounded-md cursor-pointer border ${
                    role === 'craftsman' 
                      ? 'bg-[#e91e63] border-[#e91e63] text-white' 
                      : 'bg-[#1e3a5f] border-[#2c5282] text-white hover:bg-[#2c5282]'
                  }`}
                  onClick={() => setRole('craftsman')}
                >
                  <span className="text-sm font-medium">Craftsman</span>
                </div>
                <div 
                  className={`flex items-center justify-center p-4 rounded-md cursor-pointer border ${
                    role === 'customer' 
                      ? 'bg-[#e91e63] border-[#e91e63] text-white' 
                      : 'bg-[#1e3a5f] border-[#2c5282] text-white hover:bg-[#2c5282]'
                  }`}
                  onClick={() => setRole('customer')}
                >
                  <span className="text-sm font-medium">Customer</span>
                </div>
              </div>
            </div>
            
            {role === 'craftsman' && (
              <div className="space-y-5 pt-2">
                <div className="flex flex-col space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-white">
                    Business Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your business name"
                    className="px-4 py-3 bg-[#1e3a5f] border border-[#2c5282] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                  />
                </div>
                
                <div className="flex flex-col space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium text-white">
                    Phone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+49 123 4567890"
                    className="px-4 py-3 bg-[#1e3a5f] border border-[#2c5282] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                  />
                </div>
                
                <div className="flex flex-col space-y-2">
                  <label htmlFor="specialty" className="text-sm font-medium text-white">
                    Specialty
                  </label>
                  <select
                    id="specialty"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="px-4 py-3 bg-[#1e3a5f] border border-[#2c5282] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#e91e63]"
                  >
                    <option value="">Select your specialty</option>
                    <option value="plumber">Plumber</option>
                    <option value="electrician">Electrician</option>
                    <option value="carpenter">Carpenter</option>
                    <option value="painter">Painter</option>
                    <option value="roofer">Roofer</option>
                    <option value="hvac">HVAC Technician</option>
                    <option value="mason">Mason</option>
                    <option value="landscaper">Landscaper</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            )}
            
            <button
              type="submit"
              className="w-full py-3 px-4 mt-4 bg-[#e91e63] hover:bg-[#c2185b] text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e91e63] transition-colors"
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-300">
              Already have an account?{' '}
              <a href="/auth/login" className="text-[#f48fb1] hover:text-[#e91e63]">
                Login here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
