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

    // Check if onboarding is already completed
    const onboardingCompleted = localStorage.getItem('onboardingCompleted');
    
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

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-[#0a1929]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e91e63] mx-auto"></div>
        <p className="mt-4 text-white">Loading your profile...</p>
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
    <div className="min-h-screen flex flex-col bg-[#0a1929]">
      <div className="flex-grow container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-white">Complete Your Profile</h1>
        
        {error && (
          <div className="mb-6 p-3 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-3 bg-green-100 text-green-700 rounded text-sm">
            {success}
          </div>
        )}
        
        <div className="bg-[#132f4c] rounded-lg shadow-lg p-4 md:p-8">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Your Working Hours</h2>
              <p className="text-gray-300 text-sm">Set your regular working hours for each day of the week.</p>
              
              <div className="space-y-4">
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
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[#e91e63] hover:bg-[#c2185b] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e91e63]"
              >
                {saving ? 'Saving...' : 'Save and Continue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
