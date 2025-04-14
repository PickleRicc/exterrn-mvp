'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { appointmentsAPI, customersAPI, materialsAPI, invoicesAPI } from '../../lib/api';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function AppointmentDetailPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [appointment, setAppointment] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [processingAction, setProcessingAction] = useState(null);
  const [notes, setNotes] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  
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
      const appointmentData = await appointmentsAPI.getById(id);
      setAppointment(appointmentData);
      
      // Fetch customer details
      if (appointmentData.customer_id) {
        try {
          const customerData = await customersAPI.getById(appointmentData.customer_id);
          setCustomer(customerData);
        } catch (customerErr) {
          console.error('Error fetching customer details:', customerErr);
          // Continue with the rest of the function even if customer fetch fails
        }
      }
      
      // Fetch craftsman's materials - wrapped in try/catch to handle missing endpoint
      if (appointmentData.craftsman_id) {
        try {
          // Try to fetch materials, but don't let it break the page if it fails
          const materialsData = await materialsAPI.getAll({ craftsman_id: appointmentData.craftsman_id });
          setMaterials(Array.isArray(materialsData) ? materialsData : []);
        } catch (materialsErr) {
          console.error('Materials endpoint not available:', materialsErr);
          // Set empty materials array to avoid UI errors
          setMaterials([]);
        }
      }
      
      // Set initial service price if available
      if (appointmentData.price) {
        setServicePrice(appointmentData.price.toString());
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching appointment:', err);
      setError('Failed to load appointment. Please try again.');
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

  const handleMaterialSelect = (material) => {
    // Check if material is already selected
    const existingIndex = selectedMaterials.findIndex(m => m.id === material.id);
    
    if (existingIndex >= 0) {
      // Update quantity if already selected
      const updatedMaterials = [...selectedMaterials];
      updatedMaterials[existingIndex] = {
        ...updatedMaterials[existingIndex],
        quantity: updatedMaterials[existingIndex].quantity + 1
      };
      setSelectedMaterials(updatedMaterials);
    } else {
      // Add new material with quantity 1
      setSelectedMaterials([
        ...selectedMaterials,
        {
          ...material,
          quantity: 1
        }
      ]);
    }
  };

  const handleUpdateMaterialQuantity = (materialId, quantity) => {
    if (quantity <= 0) {
      // Remove material if quantity is 0 or negative
      setSelectedMaterials(selectedMaterials.filter(m => m.id !== materialId));
    } else {
      // Update quantity
      setSelectedMaterials(selectedMaterials.map(m => 
        m.id === materialId ? { ...m, quantity } : m
      ));
    }
  };

  const handleRemoveMaterial = (materialId) => {
    setSelectedMaterials(selectedMaterials.filter(m => m.id !== materialId));
  };

  const openCompleteModal = () => {
    setShowCompleteModal(true);
  };

  const closeCompleteModal = () => {
    setShowCompleteModal(false);
  };

  const handleCompleteAppointment = async () => {
    setProcessingAction('complete');
    setError('');
    setSuccess('');
    
    try {
      // Validate service price
      const price = parseFloat(servicePrice);
      if (isNaN(price) || price < 0) {
        setError('Please enter a valid service price.');
        setProcessingAction(null);
        return;
      }
      
      // Prepare invoice items
      const invoiceItems = [
        // Add service item
        {
          description: `${appointment.title || 'Tiling Service'} - ${appointment.notes || 'Professional service'}`,
          quantity: 1,
          unit_price: price,
          service_type: appointment.service_type || 'tiling'
        }
      ];
      
      // Add selected materials
      selectedMaterials.forEach(material => {
        invoiceItems.push({
          description: `${material.name} - ${material.description || 'Tiling material'}`,
          quantity: material.quantity,
          unit_price: material.price_per_sqm || 0,
          material_id: material.id
        });
      });
      
      // Calculate total amount from items
      const totalAmount = invoiceItems.reduce((sum, item) => {
        return sum + (parseFloat(item.quantity) * parseFloat(item.unit_price));
      }, 0);
      
      // Create invoice data
      const invoiceData = {
        appointment_id: appointment.id,
        customer_id: appointment.customer_id,
        items: invoiceItems,
        amount: totalAmount,
        tax_amount: 0, // Add tax calculation if needed
        status: 'pending',
        invoice_number: `INV-${Date.now()}`,
        notes: notes,
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
      };
      
      console.log('Creating invoice with data:', invoiceData);
      
      // First, complete the appointment
      await appointmentsAPI.complete(appointment.id, { status: 'completed' });
      
      // Then create the invoice
      const invoiceResponse = await invoicesAPI.create(invoiceData);
      
      setSuccess('Appointment completed and invoice generated successfully!');
      
      // Close modal and refresh data
      setTimeout(() => {
        closeCompleteModal();
        fetchAppointment();
        
        // Redirect to the invoice page
        if (invoiceResponse && invoiceResponse.id) {
          router.push(`/invoices/${invoiceResponse.id}`);
        }
      }, 2000);
    } catch (err) {
      console.error('Error completing appointment:', err);
      setError('Failed to complete appointment. Please try again.');
    } finally {
      setProcessingAction(null);
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
              <label className="block text-sm font-medium text-white/80 mb-2">
                Materials Used
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {materials.map(material => (
                  <div 
                    key={material.id}
                    onClick={() => handleMaterialSelect(material)}
                    className="bg-white/5 border border-white/10 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <h4 className="font-medium text-white">{material.name}</h4>
                    <p className="text-white/70 text-sm">{material.description || 'No description'}</p>
                    <div className="flex justify-between mt-2">
                      <span className="text-white/70 text-sm">Price per sqm:</span>
                      <span className="text-white text-sm">{formatCurrency(material.price_per_sqm)}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedMaterials.length > 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">Selected Materials</h4>
                  
                  <div className="space-y-3">
                    {selectedMaterials.map(material => (
                      <div key={material.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                        <div>
                          <h5 className="font-medium text-white">{material.name}</h5>
                          <p className="text-white/70 text-sm">{formatCurrency(material.price_per_sqm)} per sqm</p>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateMaterialQuantity(material.id, material.quantity - 1);
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-l-lg border border-white/10 text-white hover:bg-white/20 transition-colors"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={material.quantity}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleUpdateMaterialQuantity(material.id, parseInt(e.target.value) || 0);
                              }}
                              className="w-12 h-8 bg-white/5 border-t border-b border-white/10 text-center text-white"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateMaterialQuantity(material.id, material.quantity + 1);
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-r-lg border border-white/10 text-white hover:bg-white/20 transition-colors"
                            >
                              +
                            </button>
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveMaterial(material.id);
                            }}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-white/70 italic">No materials selected. Click on materials above to add them.</p>
              )}
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
      
      <Footer />
    </div>
  );
}
