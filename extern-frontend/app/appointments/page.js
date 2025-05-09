'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { appointmentsAPI, craftsmenAPI, customersAPI } from '../lib/api';
import CalendarView from '../components/CalendarView';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function AppointmentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState({});
  const [craftsmanId, setCraftsmanId] = useState(null);
  const [filter, setFilter] = useState('upcoming'); // upcoming, past, all, pending
  const [processingAppointment, setProcessingAppointment] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [appointmentToReject, setAppointmentToReject] = useState(null);
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'calendar'
  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesList, setNotesList] = useState([]);

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
        fetchData(tokenData.craftsmanId);
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

  useEffect(() => {
    if (craftsmanId) {
      const saved = localStorage.getItem(`zimr_appointments_notes_${craftsmanId}`);
      if (saved) {
        setNotes(saved);
        setNotesList(saved.split('\n').filter(line => line.trim() !== ''));
      }
    }
  }, [craftsmanId]);

  const fetchData = async (craftsmanId) => {
    try {
      // Fetch appointments
      const appointmentsData = await craftsmenAPI.getAppointments(craftsmanId);
      setAppointments(appointmentsData);
      
      // Fetch customers to display names
      const customersData = await customersAPI.getAll({ craftsman_id: craftsmanId });
      const customersMap = {};
      customersData.forEach(customer => {
        customersMap[customer.id] = customer;
      });
      setCustomers(customersMap);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load appointments. Please try again.');
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      // Always parse the full ISO string, not just the date part
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }) + ', ' + date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Invalid Date';
    }
  };

  const getStatusClass = (status, approvalStatus) => {
    // First check approval status
    if (approvalStatus === 'pending') {
      return 'bg-yellow-100/80 text-yellow-800 border border-yellow-200/50';
    }
    if (approvalStatus === 'rejected') {
      return 'bg-red-100/80 text-red-800 border border-red-200/50';
    }
    
    // Then check appointment status
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100/80 text-blue-800 border border-blue-200/50';
      case 'completed':
        return 'bg-green-100/80 text-green-800 border border-green-200/50';
      case 'cancelled':
        return 'bg-red-100/80 text-red-800 border border-red-200/50';
      default:
        return 'bg-gray-100/80 text-gray-800 border border-gray-200/50';
    }
  };

  const getFilteredAppointments = () => {
    const now = new Date();
    
    // More detailed debug logs
    console.log('Current filter:', filter);
    console.log('Total appointments:', appointments.length);
    console.log('All appointments data:', appointments.map(apt => ({
      id: apt.id,
      date: new Date(apt.scheduled_at).toISOString(),
      isPast: new Date(apt.scheduled_at) <= now,
      isFuture: new Date(apt.scheduled_at) > now,
      status: apt.status,
      approval_status: apt.approval_status
    })));
    
    // Debug each appointment's eligibility for upcoming tab
    console.log('Upcoming eligibility check:', appointments.map(apt => {
      const isApproved = apt.approval_status === 'approved';
      const hasNoApprovalStatus = apt.approval_status === undefined || apt.approval_status === null;
      const isFuture = new Date(apt.scheduled_at) > now;
      return {
        id: apt.id,
        date: new Date(apt.scheduled_at).toISOString(),
        isFuture,
        approval_status: apt.approval_status,
        isApproved,
        hasNoApprovalStatus,
        meetsUpcomingCriteria: isFuture && (isApproved || hasNoApprovalStatus)
      };
    }));
    
    if (filter === 'pending') {
      // Show only pending appointments
      const pendingAppointments = appointments.filter(apt => apt.approval_status === 'pending');
      console.log('Filtered pending appointments:', pendingAppointments.length);
      return pendingAppointments.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    } else if (filter === 'upcoming') {
      // MODIFIED APPROACH: For upcoming, show future appointments that are NOT pending
      // This includes approved appointments and those with no approval status
      const upcomingAppointments = appointments.filter(apt => {
        const isFuture = new Date(apt.scheduled_at) > now;
        const isNotPending = apt.approval_status !== 'pending';
        
        // Debug this specific appointment
        console.log(`Appointment ${apt.id} upcoming check:`, {
          isFuture,
          approval_status: apt.approval_status,
          isNotPending,
          result: isFuture && isNotPending
        });
        
        return isFuture && isNotPending;
      });
      console.log('Filtered upcoming appointments:', upcomingAppointments.length);
      return upcomingAppointments.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    } else if (filter === 'past') {
      // For past, show past appointments that are not pending
      const pastAppointments = appointments.filter(apt => {
        const isPast = new Date(apt.scheduled_at) <= now;
        const isNotPending = apt.approval_status !== 'pending';
        
        return isPast && isNotPending;
      });
      console.log('Filtered past appointments:', pastAppointments.length);
      return pastAppointments.sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));
    } else {
      // 'all' filter - show everything
      console.log('Showing all appointments');
      return appointments.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    }
  };
  
  const handleApprove = async (appointmentId) => {
    try {
      setProcessingAppointment(appointmentId);
      
      // Debug log
      console.log(`Attempting to approve appointment ${appointmentId}`);
      
      // Get the token to verify it's available
      const token = localStorage.getItem('token');
      console.log('Auth token available:', !!token);
      
      // Call the API to approve the appointment
      const result = await appointmentsAPI.approve(appointmentId);
      console.log('Approval successful, server response:', result);
      
      // Show success message
      setSuccess('Appointment approved successfully! An email has been sent to the customer.');
      
      // Update the appointment in the local state immediately
      setAppointments(prevAppointments => 
        prevAppointments.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, approval_status: 'approved' }
            : apt
        )
      );
      
      // Also fetch fresh data from the server
      if (craftsmanId) {
        console.log('Refreshing appointment data after approval');
        await fetchData(craftsmanId);
      }
      
      // Clear the success message after 5 seconds
      setTimeout(() => {
        setSuccess('');
      }, 5000);
    } catch (err) {
      console.error('Error approving appointment:', err);
      console.error('Error details:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        url: err.config?.url
      });
      setError(`Failed to approve appointment: ${err.response?.data?.error || err.message}`);
      
      // Clear the error message after 5 seconds
      setTimeout(() => {
        setError('');
      }, 5000);
    } finally {
      setProcessingAppointment(null);
    }
  };
  
  const openRejectModal = (appointment) => {
    setAppointmentToReject(appointment);
    setRejectReason('');
    setShowRejectModal(true);
  };
  
  const closeRejectModal = () => {
    setShowRejectModal(false);
    setAppointmentToReject(null);
    setRejectReason('');
  };
  
  const handleReject = async () => {
    if (!appointmentToReject) return;
    
    try {
      setProcessingAppointment(appointmentToReject.id);
      
      // Debug log
      console.log(`Attempting to reject appointment ${appointmentToReject.id} with reason: "${rejectReason}"`);
      
      // Call the API to reject the appointment
      const result = await appointmentsAPI.reject(appointmentToReject.id, rejectReason);
      console.log('Rejection successful:', result);
      
      // Show success message
      setSuccess('Appointment rejected. The customer has been notified.');
      
      // Update the appointment in the local state immediately
      setAppointments(prevAppointments => 
        prevAppointments.map(apt => 
          apt.id === appointmentToReject.id 
            ? { ...apt, approval_status: 'rejected' }
            : apt
        )
      );
      
      // Close the modal
      closeRejectModal();
      
      // Also fetch fresh data from the server
      if (craftsmanId) {
        await fetchData(craftsmanId);
      }
      
      // Clear the success message after 5 seconds
      setTimeout(() => {
        setSuccess('');
      }, 5000);
    } catch (err) {
      console.error('Error rejecting appointment:', err);
      console.error('Error details:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        url: err.config?.url
      });
      setError(`Failed to reject appointment: ${err.response?.data?.error || err.message}`);
      
      // Clear the error message after 5 seconds
      setTimeout(() => {
        setError('');
      }, 5000);
    } finally {
      setProcessingAppointment(null);
    }
  };

  const saveNotes = () => {
    if (craftsmanId) {
      localStorage.setItem(`zimr_appointments_notes_${craftsmanId}`, notes);
      setNotesList(notes.split('\n').filter(line => line.trim() !== ''));
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 1500);
    }
  };

  // Handle appointment deletion
  const handleDelete = async (appointmentId) => {
    try {
      setProcessingAppointment(appointmentId);
      
      // Call API to delete the appointment
      await appointmentsAPI.delete(appointmentId);
      
      // Update the appointments list
      setAppointments(appointments.filter(app => app.id !== appointmentId));
      
      // Show success message
      setSuccess('Appointment has been deleted successfully.');
      
      // Hide success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error deleting appointment:', err);
      setError(err.response?.data?.error || 'Failed to delete appointment. Please try again.');
      
      // Hide error message after 5 seconds
      setTimeout(() => setError(''), 5000);
    } finally {
      setProcessingAppointment(null);
    }
  };

  // Count pending appointments
  const pendingCount = appointments.filter(apt => apt.approval_status === 'pending').length;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
      <Header />
      <main className="flex-grow container mx-auto px-5 py-8">
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">
                  Appointments
                </span>
              </h1>
              <p className="text-white/70">Manage your appointments and schedule</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {pendingCount > 0 && (
                <button 
                  onClick={() => setFilter('pending')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center ${
                    filter === 'pending' 
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' 
                      : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Pending
                  <span className="ml-1 bg-yellow-500/30 text-yellow-200 text-xs rounded-full px-2 py-0.5">
                    {pendingCount}
                  </span>
                </button>
              )}
              <button 
                onClick={() => setFilter('upcoming')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'upcoming' 
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                    : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                }`}
              >
                Upcoming
              </button>
              <button 
                onClick={() => setFilter('past')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'past' 
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                    : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                }`}
              >
                Past
              </button>
              <button 
                onClick={() => setFilter('all')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'all' 
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                    : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                }`}
              >
                All
              </button>
              <a 
                href="/appointments/new" 
                className="px-3 py-2 bg-gradient-to-r from-[#0070f3] to-[#0050d3] text-white rounded-lg shadow hover:shadow-lg transition-all flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                New
              </a>
            </div>
          </div>
          {/* Tabs for List/Calendar */}
          <div className="flex border-b border-gray-700 mb-6">
            <button
              className={`py-2 px-4 mr-2 ${activeTab === 'list' ? 'text-pink-600 border-b-2 border-pink-600 font-medium' : 'text-gray-300 hover:text-white'}`}
              onClick={() => setActiveTab('list')}
            >
              List
            </button>
            <button
              className={`py-2 px-4 ${activeTab === 'calendar' ? 'text-pink-600 border-b-2 border-pink-600 font-medium' : 'text-gray-300 hover:text-white'}`}
              onClick={() => setActiveTab('calendar')}
            >
              Calendar
            </button>
          </div>
          {loading ? (
            <div className="flex flex-col justify-center items-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#00c2ff] mx-auto"></div>
              <p className="mt-6 text-white/80 font-medium">Loading appointments...</p>
            </div>
          ) : (
            <div>
              {activeTab === 'list' && (
                <div>
                  <div className="md:hidden">
                    {getFilteredAppointments().length === 0 ? (
                      <div className="text-center py-8 text-blue-200">No appointments found for this filter.</div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {getFilteredAppointments().map((appointment) => (
                          <div key={appointment.id} className="bg-blue-900/80 rounded-xl p-4 shadow flex flex-col gap-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-blue-200 font-bold text-lg">{formatDate(appointment.scheduled_at)}</span>
                              <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusClass(appointment.status, appointment.approval_status)}`}>{appointment.status || 'N/A'}</span>
                            </div>
                            <div className="text-blue-100 text-base font-medium">{customers[appointment.customer_id]?.name || 'Unknown'}</div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${appointment.approval_status === 'approved' ? 'bg-green-500/30 text-green-200' : appointment.approval_status === 'pending' ? 'bg-yellow-500/30 text-yellow-200' : appointment.approval_status === 'rejected' ? 'bg-red-500/30 text-red-200' : 'bg-gray-500/30 text-gray-200'}`}>{appointment.approval_status || 'N/A'}</span>
                            </div>
                            <div className="flex mt-3 space-x-2">
                              {appointment.approval_status === 'pending' ? (
                                <>
                                  <button 
                                    onClick={() => handleApprove(appointment.id)}
                                    disabled={processingAppointment === appointment.id}
                                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg shadow text-xs font-semibold disabled:bg-green-800/50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                                  >
                                    {processingAppointment === appointment.id ? (
                                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                    ) : (
                                      'Approve'
                                    )}
                                  </button>
                                  <button 
                                    onClick={() => openRejectModal(appointment)}
                                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg shadow text-xs font-semibold"
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <a 
                                  href={`/appointments/${appointment.id}`}
                                  className="flex-1 px-3 py-2 bg-[#0070f3] text-white rounded-lg shadow text-center text-xs font-semibold"
                                >
                                  View Details
                                </a>
                              )}
                              <button 
                                onClick={() => handleDelete(appointment.id)}
                                disabled={processingAppointment === appointment.id}
                                className="px-3 py-2 bg-red-700 text-white rounded-lg shadow text-xs font-semibold"
                              >
                                {processingAppointment === appointment.id ? '...' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="hidden md:block overflow-x-auto rounded-lg bg-blue-900/70 shadow-lg">
                    <table className="min-w-full divide-y divide-blue-800/70">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Customer</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Approval</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-blue-900/60 divide-y divide-blue-800/70">
                        {getFilteredAppointments().length === 0 ? (
                          <tr>
                            <td colSpan="5" className="text-center py-8 text-blue-200">No appointments found for this filter.</td>
                          </tr>
                        ) : (
                          getFilteredAppointments().map((appointment) => (
                            <tr key={appointment.id} className="hover:bg-blue-800/40 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap text-blue-100">{formatDate(appointment.scheduled_at)}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-blue-100">{customers[appointment.customer_id]?.name || 'Unknown'}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusClass(appointment.status, appointment.approval_status)}`}>{appointment.status || 'N/A'}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${appointment.approval_status === 'approved' ? 'bg-green-500/30 text-green-200' : appointment.approval_status === 'pending' ? 'bg-yellow-500/30 text-yellow-200' : appointment.approval_status === 'rejected' ? 'bg-red-500/30 text-red-200' : 'bg-gray-500/30 text-gray-200'}`}>{appointment.approval_status || 'N/A'}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex gap-2">
                                  {appointment.approval_status === 'pending' ? (
                                    <>
                                      <button 
                                        onClick={() => handleApprove(appointment.id)}
                                        disabled={processingAppointment === appointment.id}
                                        className="mr-2 px-3 py-1 bg-gradient-to-r from-green-600 to-green-800 text-white rounded-lg shadow hover:shadow-lg transition-all flex items-center text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                                      >
                                        Approve
                                      </button>
                                      <button 
                                        onClick={() => openRejectModal(appointment)}
                                        disabled={processingAppointment === appointment.id}
                                        className="px-3 py-1 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg shadow hover:shadow-lg transition-all flex items-center text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  ) : (
                                    <a 
                                      href={`/appointments/${appointment.id}`}
                                      className="text-[#00c2ff] hover:text-white transition-colors mr-2"
                                    >
                                      View Details
                                    </a>
                                  )}
                                  <button
                                    onClick={() => handleDelete(appointment.id)}
                                    disabled={processingAppointment === appointment.id}
                                    className="px-3 py-1 bg-red-700 text-white rounded-lg shadow hover:shadow-lg transition-all text-xs font-semibold"
                                  >
                                    {processingAppointment === appointment.id ? '...' : 'Delete'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {activeTab === 'calendar' && (
                <div className="py-4">
                  <CalendarView appointments={appointments} />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      {/* Notes Section */}
      <section className="max-w-lg w-full mx-auto mt-6 mb-6">
        <div className="bg-[#182c47] border border-white/10 rounded-xl shadow-lg p-4">
          <div className="flex items-center mb-2">
            <span className="text-lg font-semibold text-white flex-1">My Notes &amp; Todos</span>
            {notesSaved && <span className="text-xs text-[#ff2e90] ml-2">Saved!</span>}
          </div>
          <textarea
            className="w-full min-h-[90px] bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-[#00c2ff]/40 focus:border-[#00c2ff]/40 transition-all text-base placeholder:text-white/40 resize-vertical"
            placeholder="Write notes, todos, or reminders here..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onFocus={() => setNotesSaved(false)}
          />
          <button
            onClick={saveNotes}
            className="mt-3 w-full py-2 rounded-lg bg-gradient-to-r from-[#ff2e90] to-[#00c2ff] text-white font-bold shadow hover:opacity-90 transition-all"
          >
            Save Notes
          </button>
          {notesList.length > 0 && (
            <ul className="mt-5 space-y-2 text-white/90 list-disc list-inside">
              {notesList.map((item, idx) => (
                <li key={idx} className="bg-white/5 rounded px-3 py-2 text-base">{item}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
      
      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#132f4c] rounded-xl shadow-2xl border border-white/10 p-6 max-w-md w-full animate-scale-in">
            <h3 className="text-xl font-bold text-white mb-4">Reject Appointment</h3>
            <p className="text-white/70 mb-4">
              Are you sure you want to reject this appointment with {customers[appointmentToReject?.customer_id]?.name || 'this customer'}?
              The customer will be notified by email.
            </p>
            
            <div className="mb-4">
              <label htmlFor="rejectReason" className="block text-sm font-medium text-white/80 mb-2">
                Reason for rejection (optional)
              </label>
              <textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why you're rejecting this appointment..."
                className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                rows="3"
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeRejectModal}
                className="px-4 py-2 border border-white/20 rounded-lg text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processingAppointment === appointmentToReject?.id}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg shadow hover:shadow-lg transition-all flex items-center"
              >
                {processingAppointment === appointmentToReject?.id ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Confirm Rejection'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
}
