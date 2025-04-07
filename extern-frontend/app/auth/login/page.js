'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '../../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if user was redirected from registration
    const registered = searchParams.get('registered');
    if (registered === 'true') {
      setRegistrationSuccess(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(email, password);
      
      // Store the token in localStorage
      localStorage.setItem('token', response.token);
      
      // Store user data in localStorage for easy access
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Check if user is a craftsman and redirect accordingly
      if (response.user.role === 'craftsman') {
        // Check if this is a new account that needs onboarding
        const onboardingCompleted = localStorage.getItem('onboardingCompleted');
        
        // Only redirect to onboarding if it hasn't been completed
        if (!onboardingCompleted && response.user.craftsman) {
          // Check if the craftsman has availability_hours set
          const hasAvailabilityHours = 
            response.user.craftsman.availability_hours && 
            Object.keys(response.user.craftsman.availability_hours).length > 0;
          
          if (!hasAvailabilityHours) {
            router.push('/onboarding');
            return;
          }
        }
        
        // If onboarding is completed or not needed, go to dashboard
        router.push('/');
      } else {
        // Redirect to the home page for other users
        router.push('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a1929] px-5 py-10 overflow-hidden">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">ZIMMR</h1>
          <p className="text-gray-300 text-lg">Login to your account</p>
        </div>
        
        {registrationSuccess && (
          <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-md">
            Registration successful! Please login with your credentials.
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <div className="bg-[#132f4c] rounded-lg shadow-lg p-6 md:p-8 overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-col space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-white">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
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
            
            <button
              type="submit"
              className="w-full py-3 px-4 mt-2 bg-[#e91e63] hover:bg-[#c2185b] text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e91e63] transition-colors"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-300">
              Don't have an account?{' '}
              <a href="/auth/register" className="text-[#f48fb1] hover:text-[#e91e63]">
                Register here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
