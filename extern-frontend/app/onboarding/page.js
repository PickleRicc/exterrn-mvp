'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { craftsmenAPI } from '../lib/api';

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [craftsmanId, setCraftsmanId] = useState(null);
  const [availabilityHours, setAvailabilityHours] = useState({
    monday: ['9:00-17:00'],
    tuesday: ['9:00-17:00'],
    wednesday: ['9:00-17:00'],
    thursday: ['9:00-17:00'],
    friday: ['9:00-17:00'],
    saturday: [],
    sunday: []
  });

  // Time slot options for dropdowns
  const timeSlots = [
    '6:00', '6:30', '7:00', '7:30', '8:00', '8:30', '9:00', '9:30', 
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
  ];

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // Check if this is a new registration
    const isNewRegistration = localStorage.getItem('isNewRegistration') === 'true';
    if (!isNewRegistration) {
      // Not a new registration, redirect to dashboard
      router.push('/dashboard');
      return;
    }

    // Parse the token to get user info
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      if (tokenData.craftsmanId) {
        setCraftsmanId(tokenData.craftsmanId);
        fetchCraftsmanDetails(tokenData.craftsmanId);
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

  const fetchCraftsmanDetails = async (id) => {
    try {
      const data = await craftsmenAPI.getById(id);
      
      // Check if craftsman already has availability hours set
      if (data.availability_hours && Object.keys(data.availability_hours).length > 0) {
        // If they have hours set, mark onboarding as completed
        localStorage.setItem('onboardingCompleted', 'true');
        
        setAvailabilityHours({
          ...availabilityHours,
          ...data.availability_hours,
          // Ensure all days exist in the object
          saturday: data.availability_hours.saturday || [],
          sunday: data.availability_hours.sunday || []
        });
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching craftsman details:', err);
      setError('Failed to load your profile. Please try again.');
      setLoading(false);
    }
  };

  const handleAddTimeSlot = (day) => {
    setAvailabilityHours(prev => ({
      ...prev,
      [day]: [...prev[day], '9:00-17:00']
    }));
  };

  const handleRemoveTimeSlot = (day, index) => {
    setAvailabilityHours(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index)
    }));
  };

  const handleTimeSlotChange = (day, index, startOrEnd, value) => {
    const updatedSlots = [...availabilityHours[day]];
    const [start, end] = updatedSlots[index].split('-');
    
    if (startOrEnd === 'start') {
      updatedSlots[index] = `${value}-${end}`;
    } else {
      updatedSlots[index] = `${start}-${value}`;
    }
    
    setAvailabilityHours(prev => ({
      ...prev,
      [day]: updatedSlots
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      await craftsmenAPI.update(craftsmanId, { 
        availability_hours: availabilityHours 
      });
      
      // Mark onboarding as completed and clear the new registration flag
      localStorage.setItem('onboardingCompleted', 'true');
      localStorage.removeItem('isNewRegistration');
      
      setSuccess('Your availability has been saved successfully!');
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err) {
      console.error('Error saving availability:', err);
      setError('Failed to save your availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#00c2ff] mx-auto"></div>
        <p className="mt-6 text-white/80 font-medium">Loading your profile...</p>
      </div>
    );
  }

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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
      <div className="flex-grow container mx-auto px-5 py-8 max-w-4xl">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">
              Complete Your Profile
            </span>
          </h1>
          <p className="text-white/70">Set your availability hours to help customers book appointments</p>
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
        
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 p-6 md:p-8 animate-fade-in">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Your Working Hours</h2>
                  <p className="text-white/70 text-sm mt-1">Set your regular working hours for each day of the week</p>
                </div>
                <div className="p-2 bg-[#0070f3]/20 rounded-full">
                  <svg className="w-6 h-6 text-[#0070f3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
              
              <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
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
            
            <div className="flex justify-between space-x-3 pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={() => router.push('/appointments')}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all"
              >
                Skip for Now
              </button>
              
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none transition-all duration-300 transform hover:-translate-y-0.5"
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
                  'Save and Continue'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
