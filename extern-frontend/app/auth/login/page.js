'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '../../lib/api';

// Component that uses searchParams
function LoginContent() {
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
        // Only redirect to onboarding for new craftsmen who haven't set availability
        const isNewUser = !localStorage.getItem('onboardingCompleted');
        
        if (isNewUser && response.user.craftsman) {
          // Check if the craftsman has availability_hours set
          const hasAvailabilityHours = 
            response.user.craftsman.availability_hours && 
            Object.keys(response.user.craftsman.availability_hours).length > 0;
          
          if (!hasAvailabilityHours) {
            // Mark that we've shown the onboarding, even if they don't complete it
            localStorage.setItem('onboardingShown', 'true');
            router.push('/onboarding');
            return;
          } else {
            // If they have availability hours, mark onboarding as completed
            localStorage.setItem('onboardingCompleted', 'true');
          }
        }
        
        // For all other cases, go to appointments page
        router.push('/appointments');
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#0a1929] to-[#132f4c] px-5 py-10 overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-[#0070f3] rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#7928ca] rounded-full filter blur-3xl"></div>
        </div>
      </div>
      
      <div className="w-full max-w-md z-10 animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">ZIMMR</span>
          </h1>
          <p className="text-white/80 text-lg font-light">Sign in to your account</p>
        </div>
        
        {registrationSuccess && (
          <div className="mb-6 p-4 bg-green-100/90 backdrop-blur-sm text-green-700 rounded-xl border border-green-200/50 shadow-lg animate-slide-up flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Registration successful! You can now log in.</span>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-100/90 backdrop-blur-sm text-red-700 rounded-xl border border-red-200/50 shadow-lg animate-slide-up flex items-center">
            <svg className="w-5 h-5 mr-2 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>{error}</span>
          </div>
        )}
        
        <div className="bg-white/5 backdrop-blur-sm p-6 md:p-8 rounded-xl border border-white/10 shadow-2xl">
          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div className="relative">
                <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-1.5 ml-1">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path>
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="block w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0070f3] focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
              </div>
              
              <div className="relative">
                <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-1.5 ml-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0070f3] focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full py-3.5 px-4 mt-2 bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0070f3] transition-all duration-300 transform hover:-translate-y-0.5"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing in...</span>
                </div>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-white/70">
              Don't have an account?{' '}
              <a href="/auth/register" className="text-[#00c2ff] hover:text-white transition-colors font-medium">
                Register here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function LoginLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#0a1929] to-[#132f4c] px-5 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">ZIMMR</span>
          </h1>
          <p className="text-white/80 text-lg font-light">Loading...</p>
        </div>
        <div className="flex justify-center">
          <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
}
