'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { appointmentsAPI, craftsmenAPI, customersAPI } from '../lib/api';
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
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      
      // Refresh the data
      if (craftsmanId) {
        console.log('Refreshing appointment data after approval');
        await fetchData(craftsmanId);
        
        // Debug: Check if the appointment status was updated correctly
        const updatedAppointment = appointments.find(apt => apt.id === appointmentId);
        console.log('Updated appointment after refresh:', updatedAppointment);
        
        // Force a re-render by updating a state variable
        setAppointments([...appointments]);
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
      
      // Close the modal
      closeRejectModal();
      
      // Refresh the data
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
                className="px-3 py-2 bg-gradient-to-r from-[#0070f3] to-[#0050d3] text-white rounded-lg text-sm font-medium flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                New
              </a>
            </div>
          </div>
          
          {loading ? (
            <div className="flex flex-col justify-center items-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#00c2ff] mx-auto"></div>
              <p className="mt-6 text-white/80 font-medium">Loading appointments...</p>
            </div>
          ) : getFilteredAppointments().length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg className="w-16 h-16 text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <p className="text-xl font-medium text-white mb-2">No {filter} appointments found</p>
              <p className="text-white/70 max-w-md mx-auto">
                {filter === 'pending' 
                  ? 'All appointments have been reviewed. Great job!' 
                  : filter === 'upcoming' 
                  ? 'Create a new appointment to get started with your schedule' 
                  : 'Check other filters to see more appointments'}
              </p>
              {filter === 'upcoming' && (
                <a 
                  href="/appointments/new" 
                  className="mt-6 inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#0070f3] to-[#0050d3] text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  Create Appointment
                </a>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-white/70">
                    <th className="px-4 py-3 text-left font-medium">Date & Time</th>
                    <th className="px-4 py-3 text-left font-medium">Customer</th>
                    <th className="px-4 py-3 text-left font-medium">Duration</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Notes</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {getFilteredAppointments().map(appointment => (
                    <tr key={appointment.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4 text-white">
                        <div className="font-medium">{formatDate(appointment.scheduled_at)}</div>
                      </td>
                      <td className="px-4 py-4 text-white">
                        {customers[appointment.customer_id]?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-4 text-white">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          {appointment.duration || 60} min
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs backdrop-blur-sm ${getStatusClass(appointment.status, appointment.approval_status)}`}>
                          {appointment.approval_status === 'pending' 
                            ? 'Pending Approval' 
                            : appointment.approval_status === 'rejected'
                            ? 'Rejected'
                            : appointment.status || 'scheduled'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-white/80 max-w-xs truncate">
                        {appointment.notes || '-'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          {appointment.approval_status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleApprove(appointment.id)}
                                disabled={processingAppointment === appointment.id}
                                className="px-2 py-1 bg-green-600/30 hover:bg-green-600/50 text-green-300 rounded text-xs font-medium transition-colors flex items-center"
                              >
                                {processingAppointment === appointment.id ? (
                                  <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                  </svg>
                                )}
                                Approve
                              </button>
                              <button
                                onClick={() => openRejectModal(appointment)}
                                disabled={processingAppointment === appointment.id}
                                className="px-2 py-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded text-xs font-medium transition-colors flex items-center"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                                Reject
                              </button>
                            </>
                          ) : (
                            <a 
                              href={`/appointments/${appointment.id}`}
                              className="text-[#00c2ff] hover:text-white transition-colors"
                            >
                              View Details
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      
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
