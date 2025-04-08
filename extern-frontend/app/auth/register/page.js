'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '../../lib/api';
import { craftsmenAPI } from '../../lib/api';

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
  
  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [craftsmanId, setCraftsmanId] = useState(null);
  const [token, setToken] = useState('');
  
  // Availability state
  const [availabilityHours, setAvailabilityHours] = useState({
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  
  // Time slots for availability selection
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00'
  ];

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
      const response = await authAPI.register(username, email, password, role, phone, specialty, fullName, name);
      
      if (role === 'craftsman') {
        // After registration, we need to login to get the token
        try {
          const loginResponse = await authAPI.login(email, password);
          
          // Store token for availability setting
          localStorage.setItem('token', loginResponse.token);
          setToken(loginResponse.token);
          
          // Get craftsman ID from token
          try {
            const tokenData = JSON.parse(atob(loginResponse.token.split('.')[1]));
            if (tokenData.craftsmanId) {
              setCraftsmanId(tokenData.craftsmanId);
              setRegistrationComplete(true);
              setCurrentStep(2);
            } else {
              // If no craftsman ID in token, redirect to login
              router.push('/auth/login?registered=true');
            }
          } catch (err) {
            console.error('Error parsing token:', err);
            // If we can't get the craftsman ID, redirect to login
            router.push('/auth/login?registered=true');
          }
        } catch (loginErr) {
          console.error('Error logging in after registration:', loginErr);
          // If login fails, redirect to login page
          router.push('/auth/login?registered=true');
        }
      } else {
        // For customers, redirect to login
        router.push('/auth/login?registered=true');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Availability management functions
  const handleAddTimeSlot = (day) => {
    setAvailabilityHours(prev => ({
      ...prev,
      [day]: [...prev[day], '09:00-17:00']
    }));
  };

  const handleRemoveTimeSlot = (day, index) => {
    setAvailabilityHours(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index)
    }));
  };

  const handleTimeSlotChange = (day, index, type, value) => {
    const updatedSlots = [...availabilityHours[day]];
    const [start, end] = updatedSlots[index].split('-');
    
    if (type === 'start') {
      updatedSlots[index] = `${value}-${end}`;
    } else {
      updatedSlots[index] = `${start}-${value}`;
    }
    
    setAvailabilityHours(prev => ({
      ...prev,
      [day]: updatedSlots
    }));
  };

  const handleSaveAvailability = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      await craftsmenAPI.update(craftsmanId, { 
        availability_hours: availabilityHours 
      });
      
      // Mark onboarding as completed
      localStorage.setItem('onboardingCompleted', 'true');
      
      setSuccess('Your availability has been saved successfully!');
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      console.error('Error saving availability:', err);
      setError('Failed to save your availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
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
          <p className="text-white/80 text-lg font-light">
            {currentStep === 1 ? 'Create your account' : 'Set your availability'}
          </p>
        </div>
        
        <div className="bg-[#132f4c]/40 backdrop-blur-xl rounded-2xl shadow-xl border border-white/5 p-8 overflow-hidden">
          {error && (
            <div className="mb-6 p-4 bg-red-100/90 backdrop-blur-sm text-red-700 rounded-xl border border-red-200/50 shadow-lg animate-slide-up flex items-center">
              <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
          
          {currentStep === 1 ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="relative">
                  <label htmlFor="firstName" className="block text-sm font-medium text-white/90 mb-1.5 ml-1">
                    First Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                    </div>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0070f3] focus:border-transparent transition-all duration-200"
                      required
                    />
                  </div>
                </div>
                
                <div className="relative">
                  <label htmlFor="lastName" className="block text-sm font-medium text-white/90 mb-1.5 ml-1">
                    Last Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                    </div>
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0070f3] focus:border-transparent transition-all duration-200"
                      required
                    />
                  </div>
                </div>
              </div>
              
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
                    className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0070f3] focus:border-transparent transition-all duration-200"
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
                    className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0070f3] focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
              </div>
              
              <div className="relative">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/90 mb-1.5 ml-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  </div>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0070f3] focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/90 mb-1.5 ml-1">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    className={`flex items-center justify-center p-4 rounded-xl cursor-pointer border transition-all duration-200 ${
                      role === 'craftsman' 
                        ? 'bg-gradient-to-r from-[#0070f3] to-[#0050d3] border-[#0070f3] text-white shadow-lg' 
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    }`}
                    onClick={() => setRole('craftsman')}
                  >
                    <span className="text-sm font-medium">Craftsman</span>
                  </div>
                  <div 
                    className={`flex items-center justify-center p-4 rounded-xl cursor-pointer border transition-all duration-200 ${
                      role === 'customer' 
                        ? 'bg-gradient-to-r from-[#0070f3] to-[#0050d3] border-[#0070f3] text-white shadow-lg' 
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    }`}
                    onClick={() => setRole('customer')}
                  >
                    <span className="text-sm font-medium">Customer</span>
                  </div>
                </div>
              </div>
              
              {role === 'craftsman' && (
                <div className="space-y-5 pt-2">
                  <div className="relative">
                    <label htmlFor="name" className="block text-sm font-medium text-white/90 mb-1.5 ml-1">
                      Business Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                        </svg>
                      </div>
                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your business name"
                        className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0070f3] focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>
                  
                  <div className="relative">
                    <label htmlFor="phone" className="block text-sm font-medium text-white/90 mb-1.5 ml-1">
                      Phone
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                        </svg>
                      </div>
                      <input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+49 123 4567890"
                        className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0070f3] focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>
                  
                  <div className="relative">
                    <label htmlFor="specialty" className="block text-sm font-medium text-white/90 mb-1.5 ml-1">
                      Specialty
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                      </div>
                      <select
                        id="specialty"
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0070f3] focus:border-transparent transition-all duration-200 appearance-none"
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
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <button
                type="submit"
                className="w-full py-3.5 px-4 mt-4 bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0070f3] transition-all duration-300 transform hover:-translate-y-0.5"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{role === 'craftsman' ? 'Continuing...' : 'Registering...'}</span>
                  </div>
                ) : (
                  <span>{role === 'craftsman' ? 'Continue to Availability' : 'Register'}</span>
                )}
              </button>
            </form>
          ) : (
            // Availability settings step
            <div className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Your Working Hours</h2>
                <p className="text-white/70 text-sm">Set your regular working hours for each day of the week.</p>
                
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {days.map((day) => (
                    <div key={day} className="bg-white/5 backdrop-blur-sm p-5 rounded-xl border border-white/10 space-y-3 transition-all hover:bg-white/10">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-white">{dayLabels[day]}</h3>
                        <button
                          type="button"
                          onClick={() => handleAddTimeSlot(day)}
                          className="text-[#00c2ff] hover:text-white text-sm flex items-center transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                          </svg>
                          Add Time Slot
                        </button>
                      </div>
                      
                      {availabilityHours[day].length === 0 ? (
                        <p className="text-white/50 italic text-sm">Not available</p>
                      ) : (
                        availabilityHours[day].map((timeSlot, index) => {
                          const [start, end] = timeSlot.split('-');
                          return (
                            <div key={index} className="flex items-center mb-3 space-x-2 bg-white/5 p-2 rounded-lg">
                              <div className="relative flex-1">
                                <select
                                  value={start}
                                  onChange={(e) => handleTimeSlotChange(day, index, 'start', e.target.value)}
                                  className="w-full p-2 border border-white/10 rounded-lg bg-[#132f4c] text-white appearance-none pl-3 pr-8"
                                >
                                  {timeSlots.map(time => (
                                    <option key={time} value={time}>{time}</option>
                                  ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                                  <svg className="h-4 w-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                  </svg>
                                </div>
                              </div>
                              
                              <span className="text-white/70">to</span>
                              
                              <div className="relative flex-1">
                                <select
                                  value={end}
                                  onChange={(e) => handleTimeSlotChange(day, index, 'end', e.target.value)}
                                  className="w-full p-2 border border-white/10 rounded-lg bg-[#132f4c] text-white appearance-none pl-3 pr-8"
                                >
                                  {timeSlots.map(time => (
                                    <option key={time} value={time}>{time}</option>
                                  ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                                  <svg className="h-4 w-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                  </svg>
                                </div>
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => handleRemoveTimeSlot(day, index)}
                                className="text-white/70 hover:text-red-400 p-1 rounded-full hover:bg-white/10 transition-colors"
                                aria-label="Remove time slot"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="px-4 py-3 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all duration-200"
                >
                  Skip for Now
                </button>
                <button
                  type="button"
                  onClick={handleSaveAvailability}
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0070f3] transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  {saving ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving...</span>
                    </div>
                  ) : (
                    'Complete Registration'
                  )}
                </button>
              </div>
            </div>
          )}
          
          <div className="mt-8 text-center">
            <p className="text-sm text-white/70">
              Already have an account?{' '}
              <a href="/auth/login" className="text-[#00c2ff] hover:text-white transition-colors font-medium">
                Sign in here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
