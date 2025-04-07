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
        // Store token for availability setting
        localStorage.setItem('token', response.token);
        setToken(response.token);
        
        // Get craftsman ID from token
        try {
          const tokenData = JSON.parse(atob(response.token.split('.')[1]));
          if (tokenData.craftsmanId) {
            setCraftsmanId(tokenData.craftsmanId);
            setRegistrationComplete(true);
            setCurrentStep(2);
          }
        } catch (err) {
          console.error('Error parsing token:', err);
          // If we can't get the craftsman ID, redirect to login
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a1929] px-5 py-10 overflow-hidden">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">ZIMMR</h1>
          <p className="text-gray-300 text-lg">
            {currentStep === 1 ? 'Create your account' : 'Set your availability'}
          </p>
        </div>
        
        <div className="bg-[#132f4c] rounded-lg shadow-lg p-6 md:p-8 overflow-hidden">
          {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-md text-sm">
              {success}
            </div>
          )}
          
          {currentStep === 1 ? (
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
              
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-white">
                  Account Type
                </label>
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
                {loading ? 'Registering...' : (role === 'craftsman' ? 'Continue to Availability' : 'Register')}
              </button>
            </form>
          ) : (
            // Availability settings step
            <div className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Your Working Hours</h2>
                <p className="text-gray-300 text-sm">Set your regular working hours for each day of the week.</p>
                
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {days.map((day) => (
                    <div key={day} className="bg-[#1e3a5f] p-4 rounded-md space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-white">{dayLabels[day]}</h3>
                        <button
                          type="button"
                          onClick={() => handleAddTimeSlot(day)}
                          className="text-[#f48fb1] hover:text-[#e91e63] text-sm"
                        >
                          + Add Time Slot
                        </button>
                      </div>
                      
                      {availabilityHours[day].length === 0 ? (
                        <p className="text-gray-400 italic">Not available</p>
                      ) : (
                        availabilityHours[day].map((timeSlot, index) => {
                          const [start, end] = timeSlot.split('-');
                          return (
                            <div key={index} className="flex items-center mb-2 space-x-2">
                              <select
                                value={start}
                                onChange={(e) => handleTimeSlotChange(day, index, 'start', e.target.value)}
                                className="p-2 border border-gray-600 rounded bg-[#1e3a5f] text-white"
                              >
                                {timeSlots.map(time => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                              <span className="text-white">to</span>
                              <select
                                value={end}
                                onChange={(e) => handleTimeSlotChange(day, index, 'end', e.target.value)}
                                className="p-2 border border-gray-600 rounded bg-[#1e3a5f] text-white"
                              >
                                {timeSlots.map(time => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleRemoveTimeSlot(day, index)}
                                className="text-[#f48fb1] hover:text-[#e91e63]"
                              >
                                Remove
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
                  className="px-4 py-2 border border-[#2c5282] text-white rounded-md hover:bg-[#1e3a5f]"
                >
                  Skip for Now
                </button>
                <button
                  type="button"
                  onClick={handleSaveAvailability}
                  disabled={saving}
                  className="px-4 py-2 bg-[#e91e63] hover:bg-[#c2185b] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e91e63]"
                >
                  {saving ? 'Saving...' : 'Complete Registration'}
                </button>
              </div>
            </div>
          )}
          
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
