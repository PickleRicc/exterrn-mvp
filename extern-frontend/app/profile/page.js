'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { craftsmenAPI } from '../lib/api';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('details'); // details, availability, security
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [craftsmanId, setCraftsmanId] = useState(null);
  const [userDetails, setUserDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialty: ''
  });
  
  // Availability hours state
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

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // Parse the token to get user info
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      if (tokenData.craftsmanId) {
        setCraftsmanId(tokenData.craftsmanId);
        fetchCraftsmanDetails(tokenData.craftsmanId);
      } else {
        setError('Your account is not set up as a craftsman. Some features may be limited.');
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
      
      // Update user details
      if (data.user) {
        setUserDetails({
          firstName: data.user.first_name || '',
          lastName: data.user.last_name || '',
          email: data.user.email || '',
          phone: data.phone || '',
          specialty: data.specialty || ''
        });
      }
      
      // Update availability hours if available
      if (data.availability_hours && Object.keys(data.availability_hours).length > 0) {
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

  // Availability management functions
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

  const handleSaveAvailability = async () => {
    if (!craftsmanId) {
      setError('Craftsman ID not available. Please refresh the page or contact support.');
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      await craftsmenAPI.update(craftsmanId, { 
        availability_hours: availabilityHours 
      });
      
      setSuccess('Your availability hours have been saved successfully!');
      
      // Clear success message after a few seconds
      setTimeout(() => {
        setSuccess('');
      }, 5000);
    } catch (err) {
      console.error('Error saving availability:', err);
      setError('Failed to save your availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#121212] to-[#1a1a1a] px-4 py-6 md:py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => router.back()} 
            className="mr-3 p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Profile Settings</h1>
        </div>
        
        {/* Profile Tabs */}
        <div className="bg-white/5 rounded-xl p-1 mb-6 flex overflow-x-auto">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium ${activeTab === 'details' ? 'bg-[#ffcb00] text-black' : 'text-white hover:bg-white/10'} transition-colors`}
          >
            Personal Details
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium ${activeTab === 'availability' ? 'bg-[#ffcb00] text-black' : 'text-white hover:bg-white/10'} transition-colors`}
          >
            Availability
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium ${activeTab === 'security' ? 'bg-[#ffcb00] text-black' : 'text-white hover:bg-white/10'} transition-colors`}
          >
            Security
          </button>
        </div>

        {/* Error and Success Messages */}
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

        {loading ? (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 overflow-hidden p-8 flex justify-center items-center">
            <div className="flex flex-col items-center">
              <svg className="animate-spin mb-3 h-10 w-10 text-[#ffcb00]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-white">Loading your profile...</span>
            </div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            {/* Personal Details Tab */}
            {activeTab === 'details' && (
              <div className="p-6 md:p-8">
                <h2 className="text-xl font-semibold text-white mb-6">Personal Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white">First Name</label>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-white">
                      {userDetails.firstName || 'Not provided'}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white">Last Name</label>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-white">
                      {userDetails.lastName || 'Not provided'}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white">Email</label>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-white">
                      {userDetails.email || 'Not provided'}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white">Phone</label>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-white">
                      {userDetails.phone || 'Not provided'}
                    </div>
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-medium text-white">Specialty</label>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-white">
                      {userDetails.specialty || 'Not provided'}
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-white/10">
                  <button 
                    onClick={() => setActiveTab('security')}
                    className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-lg transition-colors"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            )}
            
            {/* Availability Tab */}
            {activeTab === 'availability' && (
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-white">Working Hours</h2>
                  <button
                    onClick={handleSaveAvailability}
                    disabled={saving}
                    className="px-4 py-2 bg-[#ffcb00] hover:bg-[#e6b800] text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    ) : 'Save Changes'}
                  </button>
                </div>
                
                <p className="text-white/70 mb-6">Set your regular working hours for each day of the week. Customers will be able to book appointments during these hours.</p>
                
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {days.map((day) => (
                    <div key={day} className="bg-white/5 p-5 rounded-xl border border-white/10 space-y-4 transition-all hover:bg-white/10">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-white">{dayLabels[day]}</h3>
                        <button
                          type="button"
                          onClick={() => handleAddTimeSlot(day)}
                          className="text-[#ffcb00] hover:text-white text-sm flex items-center transition-colors"
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
                            <div key={index} className="flex items-center space-x-2 bg-[#2a2a2a]/80 p-3 rounded-lg">
                              <div className="relative flex-1">
                                <select
                                  value={start}
                                  onChange={(e) => handleTimeSlotChange(day, index, 'start', e.target.value)}
                                  className="w-full p-2 border border-[#2a2a2a] rounded-lg bg-[#2a2a2a]/50 text-white appearance-none pl-3 pr-8 focus:ring-2 focus:ring-[#ffcb00]/50 focus:border-[#ffcb00]/50 transition-all"
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
                                  className="w-full p-2 border border-[#2a2a2a] rounded-lg bg-[#2a2a2a]/50 text-white appearance-none pl-3 pr-8 focus:ring-2 focus:ring-[#ffcb00]/50 focus:border-[#ffcb00]/50 transition-all"
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
                
                <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                  <button
                    onClick={handleSaveAvailability}
                    disabled={saving}
                    className="px-6 py-3 bg-[#ffcb00] hover:bg-[#e6b800] text-black font-medium rounded-lg shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving Changes...
                      </span>
                    ) : 'Save All Changes'}
                  </button>
                </div>
              </div>
            )}
            
            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="p-6 md:p-8">
                <h2 className="text-xl font-semibold text-white mb-6">Security Settings</h2>
                
                <div className="space-y-6">
                  <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                    <h3 className="font-medium text-white mb-4">Change Password</h3>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white">Current Password</label>
                        <input 
                          type="password" 
                          placeholder="••••••••" 
                          className="w-full p-3 border border-[#2a2a2a] rounded-lg bg-[#2a2a2a]/50 text-white appearance-none focus:ring-2 focus:ring-[#ffcb00]/50 focus:border-[#ffcb00]/50 transition-all"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white">New Password</label>
                        <input 
                          type="password" 
                          placeholder="••••••••" 
                          className="w-full p-3 border border-[#2a2a2a] rounded-lg bg-[#2a2a2a]/50 text-white appearance-none focus:ring-2 focus:ring-[#ffcb00]/50 focus:border-[#ffcb00]/50 transition-all"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white">Confirm New Password</label>
                        <input 
                          type="password" 
                          placeholder="••••••••" 
                          className="w-full p-3 border border-[#2a2a2a] rounded-lg bg-[#2a2a2a]/50 text-white appearance-none focus:ring-2 focus:ring-[#ffcb00]/50 focus:border-[#ffcb00]/50 transition-all"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <button className="px-4 py-2 bg-[#ffcb00] hover:bg-[#e6b800] text-black font-medium rounded-lg transition-colors">
                        Update Password
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                    <h3 className="font-medium text-white mb-2">Two-Factor Authentication</h3>
                    <p className="text-white/70 text-sm mb-4">Add an extra layer of security to your account.</p>
                    
                    <button className="px-4 py-2 border border-[#2a2a2a] text-white rounded-lg hover:bg-white/10 transition-colors">
                      Enable 2FA
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
