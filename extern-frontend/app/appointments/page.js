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
  const [filter, setFilter] = useState('all'); 
  const [processingAppointment, setProcessingAppointment] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [appointmentToReject, setAppointmentToReject] = useState(null);
  const [debugMode, setDebugMode] = useState(false);
  
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

  // Add a refresh effect when the component mounts or when navigating back to this page
  useEffect(() => {
    if (craftsmanId) {
      fetchData(craftsmanId);
    }
  }, [craftsmanId]); 

  const fetchData = async (craftsmanId) => {
    try {
      setLoading(true);
      // Fetch appointments
      const appointmentsData = await appointmentsAPI.getAll({ craftsman_id: craftsmanId });
      
      if (debugMode) {
        console.log('Fetched appointments:', appointmentsData);
      }
      
      // Ensure appointmentsData is an array
      setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
      
      // Fetch customers to display names
      const customersData = await customersAPI.getAll({ craftsman_id: craftsmanId });
      
      // Ensure customersData is an array before using forEach
      const customersMap = {};
      if (Array.isArray(customersData)) {
        customersData.forEach(customer => {
          customersMap[customer.id] = customer;
        });
      } else {
        console.error('Customer data is not an array:', customersData);
      }
      
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
    // Ensure appointments is an array before filtering
    if (!Array.isArray(appointments)) {
      console.error('Appointments is not an array:', appointments);
      return [];
    }
    
    if (debugMode) {
      console.log('Filtering appointments:', appointments.length, 'filter:', filter);
      console.log('Raw appointments data:', appointments);
    }
    
    const now = new Date();
    
    if (filter === 'pending') {
      return appointments
        .filter(apt => apt.approval_status === 'pending')
        .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    } else if (filter === 'upcoming') {
      return appointments
        .filter(apt => {
          // Check if scheduled_at is a valid date string
          if (!apt.scheduled_at) return false;
          
          try {
            const aptDate = new Date(apt.scheduled_at);
            return aptDate > now && apt.approval_status !== 'rejected';
          } catch (e) {
            console.error('Invalid date format:', apt.scheduled_at);
            return false;
          }
        })
        .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    } else if (filter === 'past') {
      return appointments
        .filter(apt => {
          if (!apt.scheduled_at) return false;
          
          try {
            const aptDate = new Date(apt.scheduled_at);
            return aptDate <= now && apt.approval_status !== 'rejected';
          } catch (e) {
            console.error('Invalid date format:', apt.scheduled_at);
            return false;
          }
        })
        .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));
    } else {
      // 'all' filter - show everything
      return appointments
        .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));
    }
  };
  
  const handleApprove = async (appointmentId) => {
    try {
      setProcessingAppointment(appointmentId);
      
      // Debug log
      console.log(`Attempting to approve appointment ${appointmentId}`);
      
      // Call the API to approve the appointment
      const result = await appointmentsAPI.approve(appointmentId);
      console.log('Approval successful:', result);
      
      // Show success message
      setSuccess('Appointment approved successfully! An email has been sent to the customer.');
      
      // Refresh the data
      if (craftsmanId) {
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
  const pendingCount = Array.isArray(appointments) ? appointments.filter(apt => apt.approval_status === 'pending').length : 0;

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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-0">Appointments</h1>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <div className="flex-grow">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-[#071a2b] text-white border border-white/10 focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                >
                  <option value="all">All Appointments</option>
                  <option value="upcoming">Upcoming Appointments</option>
                  <option value="past">Past Appointments</option>
                  <option value="pending">Pending Approval</option>
                </select>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => fetchData(craftsmanId)}
                  className="px-4 py-2 bg-[#071a2b] hover:bg-[#0a2540] text-white rounded-lg border border-white/10 transition-colors flex items-center justify-center"
                  title="Refresh appointments"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                </button>
                
                <button
                  onClick={() => setDebugMode(!debugMode)}
                  className={`px-4 py-2 ${debugMode ? 'bg-green-600/50' : 'bg-[#071a2b]'} hover:bg-[#0a2540] text-white rounded-lg border border-white/10 transition-colors flex items-center justify-center`}
                  title="Toggle debug mode"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
                  </svg>
                </button>
                
                <a
                  href="/appointments/new"
                  className="px-4 py-2 bg-[#071a2b] hover:bg-[#0a2540] text-white rounded-lg border border-white/10 transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  New Appointment
                </a>
              </div>
            </div>
          </div>
          
          {debugMode && (
            <div className="mb-6 p-4 bg-black/30 rounded-xl border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-2">Debug Information</h3>
              <div className="text-white/70 text-sm overflow-auto max-h-40">
                <p>Craftsman ID: {craftsmanId}</p>
                <p>Total Appointments: {appointments.length}</p>
                <p>Filtered Appointments: {getFilteredAppointments().length}</p>
                <p>Current Filter: {filter}</p>
                <details>
                  <summary className="cursor-pointer">Appointment Data</summary>
                  <pre className="text-xs overflow-auto mt-2">
                    {JSON.stringify(appointments, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          )}

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
