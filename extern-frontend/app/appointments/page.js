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
        setError('Ihr Konto ist nicht als Handwerker eingerichtet. Bitte kontaktieren Sie den Support.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error parsing token:', err);
      setError('Sitzungsfehler. Bitte melden Sie sich erneut an.');
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
      setError('Fehler beim Laden der Termine. Bitte versuchen Sie es erneut.');
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
      setSuccess('Der Termin wurde erfolgreich genehmigt! Eine E-Mail wurde an den Kunden gesendet.');
      
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
      setError(`Fehler beim Genehmigen des Termins: ${err.response?.data?.error || err.message}`);
      
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
      setSuccess('Der Termin wurde abgelehnt. Der Kunde wurde per E-Mail benachrichtigt.');
      
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
      setError(`Fehler beim Ablehnen des Termins: ${err.response?.data?.error || err.message}`);
      
      // Clear the error message after 5 seconds
      setTimeout(() => {
        setError('');
      }, 5000);
    } finally {
      setProcessingAppointment(null);
    }
  };

  // Handle appointment deletion
  const handleDelete = async (appointmentId) => {
    try {
      setProcessingAppointment(appointmentId);
      
      // Find appointment details before deletion for the success message
      const appointment = appointments.find(app => app.id === appointmentId);
      const customerName = appointment ? (customers[appointment.customer_id]?.name || 'Kunde') : 'Kunde';
      
      // Call API to delete the appointment
      await appointmentsAPI.delete(appointmentId);
      
      // Update the appointments list
      setAppointments(appointments.filter(app => app.id !== appointmentId));
      
      // Show success message with customer name and date
      setSuccess(`Der Termin mit ${customerName} wurde erfolgreich gelöscht.`);
      
      // Hide success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error deleting appointment:', err);
      setError(err.response?.data?.error || 'Fehler beim Löschen des Termins. Bitte versuchen Sie es erneut.');
      
      // Hide error message after 5 seconds
      setTimeout(() => setError(''), 5000);
    } finally {
      setProcessingAppointment(null);
    }
  };

  // Count pending appointments
  const pendingCount = appointments.filter(apt => apt.approval_status === 'pending').length;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#121212] to-[#1a1a1a]">
      <Header title="Termine" />
      
      <main className="flex-grow container mx-auto px-4 py-6 sm:px-6 md:py-8">
        {loading ? (
          <div className="flex justify-center mt-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffcb00]"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100/10 border border-red-200/20 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        ) : (
          <div>
            {/* View Toggle and Filter Controls - Mobile Responsive */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* View Toggle */}
              <div className="flex rounded-lg bg-white/5 overflow-hidden p-1 w-full md:w-auto mb-3 md:mb-0">
                <button
                  onClick={() => setActiveTab('list')}
                  className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-all ${
                    activeTab === 'list'
                      ? 'bg-[#ffcb00] text-black shadow-md' 
                      : 'text-white/80 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
                    </svg>
                    Listenansicht
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('calendar')}
                  className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-all ${
                    activeTab === 'calendar'
                      ? 'bg-[#ffcb00] text-black shadow-md'
                      : 'text-white/80 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    Kalender
                  </span>
                </button>
              </div>

              {/* Filter and New Button */}
              <div className="flex flex-row items-center justify-between gap-3 md:ml-auto">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="rounded-lg bg-white/5 text-white border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#ffcb00]/50 focus:border-[#ffcb00]/50 transition-all"
                >
                  <option value="upcoming">Zukünftige Termine</option>
                  <option value="past">Vergangene Termine</option>
                  <option value="all">Alle Termine</option>
                  <option value="pending">Genehmigung ausstehend</option>
                </select>
                
                <button
                  onClick={() => router.push('/appointments/new')}
                  className="bg-[#ffcb00] hover:bg-[#e6b800] text-black px-3 py-2 rounded-lg shadow text-sm font-medium flex items-center whitespace-nowrap"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                  Neuer Termin
                </button>
              </div>
            </div>
            
            {/* Render appointments based on active tab */}
            {activeTab === 'calendar' ? (
              <CalendarView appointments={getFilteredAppointments()} />
            ) : (
              <>
                {/* List View */}
                <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden shadow-lg transition-all duration-300 hover:bg-white/10">
                  {getFilteredAppointments().length === 0 ? (
                    <div className="text-center py-8 text-white/70">Keine Termine gefunden für diesen Filter.</div>
                  ) : (
                    <div className="flex flex-col gap-4 p-4">
                      {getFilteredAppointments().map((appointment) => (
                        <div key={appointment.id} className="bg-white/5 rounded-lg p-4 shadow flex flex-col gap-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-white/80 font-bold text-lg">{formatDate(appointment.scheduled_at)}</span>
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusClass(appointment.status, appointment.approval_status)}`}>{appointment.status || 'N/A'}</span>
                          </div>
                          <div className="text-white/80 text-base font-medium">{customers[appointment.customer_id]?.name || 'Unbekannt'}</div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${appointment.approval_status === 'approved' ? 'bg-green-500/30 text-green-200' : appointment.approval_status === 'pending' ? 'bg-yellow-500/30 text-yellow-200' : appointment.approval_status === 'rejected' ? 'bg-red-500/30 text-red-200' : 'bg-gray-500/30 text-gray-200'}`}>{appointment.approval_status || 'N/A'}</span>
                          </div>
                          <div className="flex mt-3 space-x-2">
                            <button
                              onClick={() => router.push(`/appointments/${appointment.id}`)}
                              className="text-xs bg-[#2a2a2a]/70 hover:bg-[#2a2a2a] text-[#ffcb00] px-2 py-1 rounded transition-colors flex items-center justify-center"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                              </svg>
                              Ansehen
                            </button>
                            {appointment.approval_status === 'pending' && (
                              <div className="flex flex-col md:flex-row mt-2 md:mt-0 md:ml-2 gap-2">
                                <button
                                  onClick={() => handleApprove(appointment.id)}
                                  disabled={processingAppointment === appointment.id}
                                  className="text-xs bg-[#ffcb00] hover:bg-[#e6b800] text-black px-2 py-1 rounded transition-colors flex items-center justify-center"
                                >
                                  {processingAppointment === appointment.id ? (
                                    <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                  ) : (
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                  )}
                                  Genehmigen
                                </button>
                                <button
                                  onClick={() => openRejectModal(appointment)}
                                  disabled={processingAppointment === appointment.id}
                                  className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded transition-colors flex items-center justify-center"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                  Ablehnen
                                </button>
                              </div>
                            )}
                            <button
                              onClick={() => handleDelete(appointment.id)}
                              className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-1 rounded transition-colors flex items-center justify-center group"
                            >
                              <svg className="w-3 h-3 mr-1 text-red-400 group-hover:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                              Löschen
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>
      
      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#121212] rounded-xl shadow-2xl border border-white/10 p-6 max-w-md w-full animate-scale-in">
            <h3 className="text-xl font-bold text-white mb-4">Termin ablehnen</h3>
            <p className="text-white/70 mb-4">
              Sind Sie sicher, dass Sie diesen Termin mit {customers[appointmentToReject?.customer_id]?.name || 'diesem Kunden'} ablehnen möchten?
              Der Kunde wird per E-Mail benachrichtigt.
            </p>
            
            <div className="mb-4">
              <label htmlFor="rejectReason" className="block text-sm font-medium text-white/80 mb-2">
                Grund für die Ablehnung (optional)
              </label>
              <textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Erklären Sie, warum Sie diesen Termin ablehnen..."
                className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#ffcb00]/50 focus:border-[#ffcb00]/50 transition-all"
                rows="3"
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeRejectModal}
                className="px-4 py-2 border border-white/20 rounded-lg text-white hover:bg-white/5 transition-all"
              >
                Abbrechen
              </button>
              <button
                onClick={handleReject}
                disabled={processingAppointment === appointmentToReject?.id}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow hover:shadow-lg transition-all flex items-center"
              >
                {processingAppointment === appointmentToReject?.id ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verarbeitung...
                  </>
                ) : (
                  'Ablehnung bestätigen'
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
