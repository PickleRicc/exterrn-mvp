'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { appointmentsAPI, customersAPI } from '../../lib/api';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function AppointmentDetailPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [appointment, setAppointment] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [processingAction, setProcessingAction] = useState(null);
  const [notes, setNotes] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [editForm, setEditForm] = useState({
    scheduled_at: '',
    notes: '',
    duration: '',
    location: ''
  });
  
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    if (id) {
      fetchAppointment();
    }
  }, [id, router]);

  const fetchAppointment = async () => {
    try {
      // Fetch appointment details
      console.log(`Fetching appointment with ID: ${id}`);
      const appointmentData = await appointmentsAPI.getById(id);
      console.log('Appointment data received:', appointmentData);
      setAppointment(appointmentData);
      
      // Fetch customer details
      if (appointmentData.customer_id) {
        try {
          console.log(`Fetching customer with ID: ${appointmentData.customer_id}`);
          const customerData = await customersAPI.getById(appointmentData.customer_id);
          console.log('Customer data received:', customerData);
          setCustomer(customerData);
        } catch (customerErr) {
          console.error('Error fetching customer details:', customerErr);
          // Continue with the rest of the function even if customer fetch fails
        }
      }
      
      // Set initial service price if available
      if (appointmentData.price) {
        setServicePrice(appointmentData.price.toString());
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching appointment:', err);
      
      // Check if it's a 404 error
      if (err.response && err.response.status === 404) {
        setError('Appointment not found. It may have been deleted or you do not have permission to view it.');
      } else {
        setError('Failed to load appointment. Please try again.');
      }
      
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
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

  // Format currency for display
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '€0.00';
    
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
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

  const openCompleteModal = () => {
    setShowCompleteModal(true);
  };

  const closeCompleteModal = () => {
    setShowCompleteModal(false);
  };

  const openEditModal = () => {
    if (appointment) {
      // Format the date-time for the input field (YYYY-MM-DDThh:mm)
      const scheduledDate = new Date(appointment.scheduled_at);
      const formattedDate = scheduledDate.toISOString().slice(0, 16);
      
      setEditForm({
        scheduled_at: formattedDate,
        notes: appointment.notes || '',
        duration: appointment.duration || 60,
        location: appointment.location || ''
      });
      setShowEditModal(true);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveAppointment = async () => {
    if (!appointment) return;
    
    setProcessingAction('edit');
    setError('');
    try {
      const updatedData = {
        ...editForm,
        duration: parseInt(editForm.duration) || 60
      };
      
      // Call the API to update the appointment
      const result = await appointmentsAPI.update(id, updatedData);
      
      // The backend returns the updated appointment directly
      if (result) {
        // Update the appointment state with the result from the server
        setAppointment(result);
        
        // Update the notes state if it's being used elsewhere in the UI
        if (result.notes) {
          setNotes(result.notes);
        }
        
        setSuccess('Appointment updated successfully');
        setShowEditModal(false);
      }
    } catch (err) {
      console.error('Error updating appointment:', err);
      setError('Failed to update appointment. Please try again.');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleCompleteAppointment = async () => {
    try {
      // Validate required fields
      if (!servicePrice || parseFloat(servicePrice) <= 0) {
        setError('Please enter a valid service price.');
        return;
      }
      
      setProcessingAction('complete');
      setError('');
      
      // Update appointment status to completed
      await appointmentsAPI.complete(appointment.id, { 
        status: 'completed',
        price: servicePrice,
        notes: notes
      });
      
      setSuccess('Appointment completed successfully!');
      
      // Redirect to the new invoice page with appointment data
      setTimeout(() => {
        // Encode appointment data to pass to the new invoice page
        const appointmentData = {
          appointment_id: appointment.id,
          customer_id: appointment.customer_id,
          craftsman_id: appointment.craftsman_id,
          amount: servicePrice, // Pre-fill the amount with service price
          location: appointment.location || '',
          service_date: appointment.scheduled_at ? new Date(appointment.scheduled_at).toISOString().split('T')[0] : '',
          notes: notes || appointment.notes || '',
          from_appointment: true
        };
        
        // Create query string with appointment data
        const queryString = new URLSearchParams(appointmentData).toString();
        
        // Redirect to new invoice page with appointment data
        router.push(`/invoices/new?${queryString}`);
      }, 1000);
    } catch (err) {
      console.error('Error completing appointment:', err);
      setError('Failed to complete appointment. Please try again.');
    } finally {
      setProcessingAction(null);
      setShowCompleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#071a2b] to-[#132f4c]">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00c2ff]"></div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#071a2b] to-[#132f4c]">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="bg-[#132f4c]/50 backdrop-blur-sm rounded-xl border border-white/10 shadow-xl p-6 mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">Appointment Not Found</h1>
            {error && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6">
                <p>{error}</p>
              </div>
            )}
            <a
              href="/appointments"
              className="inline-flex items-center px-4 py-2 bg-[#071a2b] hover:bg-[#0a2540] text-white rounded-lg border border-white/10 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              Back to Appointments
            </a>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#071a2b] to-[#132f4c]">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="bg-[#132f4c]/50 backdrop-blur-sm rounded-xl border border-white/10 shadow-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <div className="flex items-center mb-2">
                <a
                  href="/appointments"
                  className="mr-3 text-white/70 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                  </svg>
                </a>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{appointment.title || 'Appointment Details'}</h1>
              </div>
              <div className="flex items-center">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(appointment.status, appointment.approval_status)}`}>
                  {appointment.status === 'completed' ? 'Completed' : 
                   appointment.approval_status === 'pending' ? 'Pending Approval' :
                   appointment.approval_status === 'rejected' ? 'Rejected' :
                   'Scheduled'}
                </span>
              </div>
            </div>
            
            {appointment.status !== 'completed' && appointment.approval_status !== 'rejected' && (
              <div className="flex space-x-3">
                <button
                  onClick={openCompleteModal}
                  className="mt-4 md:mt-0 px-4 py-2 bg-gradient-to-r from-[#0070f3] to-[#0050d3] text-white font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none transition-all duration-300"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Complete & Generate Invoice
                  </div>
                </button>
                <button
                  onClick={openEditModal}
                  className="mt-4 md:mt-0 px-4 py-2 bg-[#071a2b] hover:bg-[#0a2540] text-white font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none transition-all duration-300"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-1.073-5.73-6.568 6.569-4.725-4.725-1.073-1.073 5.768-5.768 4.725 4.725z"></path>
                    </svg>
                    Edit Appointment
                  </div>
                </button>
              </div>
            )}
          </div>
          
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6">
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-900/20 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg mb-6">
              <p>{success}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-[#071a2b]/50 rounded-xl border border-white/10 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Appointment Details</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/70">Date & Time:</span>
                  <span className="text-white">{formatDate(appointment.start_time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Duration:</span>
                  <span className="text-white">{appointment.duration} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Location:</span>
                  <span className="text-white">{appointment.location || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Service Type:</span>
                  <span className="text-white">{appointment.service_type || 'Not specified'}</span>
                </div>
                {appointment.price && (
                  <div className="flex justify-between">
                    <span className="text-white/70">Price:</span>
                    <span className="text-white">{formatCurrency(appointment.price)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-white/70">Status:</span>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(appointment.status, appointment.approval_status)}`}>
                    {appointment.status === 'completed' ? 'Completed' : 
                     appointment.approval_status === 'pending' ? 'Pending Approval' :
                     appointment.approval_status === 'rejected' ? 'Rejected' :
                     'Scheduled'}
                  </span>
                </div>
              </div>
              
              {appointment.notes && (
                <div className="mt-6">
                  <h3 className="text-white font-medium mb-2">Notes:</h3>
                  <p className="text-white/80 bg-[#071a2b]/70 p-3 rounded-lg border border-white/5 whitespace-pre-line">
                    {appointment.notes}
                  </p>
                </div>
              )}
            </div>
            
            {customer && (
              <div className="bg-[#071a2b]/50 rounded-xl border border-white/10 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Customer Information</h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-white/70">Name:</span>
                    <span className="text-white">{customer.name}</span>
                  </div>
                  {customer.email && (
                    <div className="flex justify-between">
                      <span className="text-white/70">Email:</span>
                      <span className="text-white">{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex justify-between">
                      <span className="text-white/70">Phone:</span>
                      <span className="text-white">{customer.phone}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex justify-between">
                      <span className="text-white/70">Address:</span>
                      <span className="text-white">{customer.address}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <a
                      href={`/customers/${customer.id}`}
                      className="text-[#00c2ff] hover:text-white transition-colors inline-flex items-center"
                    >
                      <span>View Customer Profile</span>
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Complete Appointment Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#132f4c] rounded-xl shadow-2xl border border-white/10 p-6 max-w-3xl w-full animate-scale-in overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold text-white mb-4">Complete Appointment & Generate Invoice</h3>
            
            {error && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6">
                <p>{error}</p>
              </div>
            )}
            
            {success && (
              <div className="bg-green-900/20 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg mb-6">
                <p>{success}</p>
              </div>
            )}
            
            <div className="mb-6">
              <label htmlFor="servicePrice" className="block text-sm font-medium text-white/80 mb-2">
                Service Price (€)
              </label>
              <input
                id="servicePrice"
                type="number"
                min="0"
                step="0.01"
                value={servicePrice}
                onChange={(e) => setServicePrice(e.target.value)}
                placeholder="Enter service price"
                className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="notes" className="block text-sm font-medium text-white/80 mb-2">
                Invoice Notes (optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for the invoice..."
                className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                rows="3"
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeCompleteModal}
                className="px-4 py-2 border border-white/20 rounded-lg text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteAppointment}
                disabled={processingAction === 'complete'}
                className="px-4 py-2 bg-gradient-to-r from-[#0070f3] to-[#0050d3] text-white rounded-lg shadow hover:shadow-lg transition-all flex items-center"
              >
                {processingAction === 'complete' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Complete & Generate Invoice
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Appointment Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#132f4c] rounded-xl shadow-2xl border border-white/10 p-6 max-w-3xl w-full animate-scale-in overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold text-white mb-4">Edit Appointment</h3>
            
            {error && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6">
                <p>{error}</p>
              </div>
            )}
            
            {success && (
              <div className="bg-green-900/20 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg mb-6">
                <p>{success}</p>
              </div>
            )}
            
            <div className="mb-6">
              <label htmlFor="scheduledAt" className="block text-sm font-medium text-white/80 mb-2">
                Scheduled Date & Time
              </label>
              <input
                id="scheduledAt"
                type="datetime-local"
                value={editForm.scheduled_at}
                onChange={handleEditFormChange}
                name="scheduled_at"
                className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="notes" className="block text-sm font-medium text-white/80 mb-2">
                Notes
              </label>
              <textarea
                id="notes"
                value={editForm.notes}
                onChange={handleEditFormChange}
                name="notes"
                placeholder="Add any notes for the appointment..."
                className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
                rows="3"
              ></textarea>
            </div>
            
            <div className="mb-6">
              <label htmlFor="duration" className="block text-sm font-medium text-white/80 mb-2">
                Duration (minutes)
              </label>
              <input
                id="duration"
                type="number"
                min="1"
                value={editForm.duration}
                onChange={handleEditFormChange}
                name="duration"
                className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="location" className="block text-sm font-medium text-white/80 mb-2">
                Location
              </label>
              <input
                id="location"
                type="text"
                value={editForm.location}
                onChange={handleEditFormChange}
                name="location"
                className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#00c2ff]/50 focus:border-[#00c2ff]/50 transition-all"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 border border-white/20 rounded-lg text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAppointment}
                disabled={processingAction === 'edit'}
                className="px-4 py-2 bg-[#071a2b] hover:bg-[#0a2540] text-white rounded-lg shadow hover:shadow-lg transition-all flex items-center"
              >
                {processingAction === 'edit' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-1.073-5.73-6.568 6.569-4.725-4.725-1.073-1.073 5.768-5.768 4.725 4.725z"></path>
                    </svg>
                    Save Changes
                  </>
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
