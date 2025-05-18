'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { customersAPI, appointmentsAPI } from '../../lib/api';
import { quotesAPI } from '../../../lib/api/quotesAPI';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { generateInvoicePdf } from '../../../lib/utils/pdfGenerator';

export default function NewQuotePage() {
  // Format date for better readability in the dropdown
  const formatAppointmentDate = (dateString) => {
    if (!dateString) return 'Kein Datum';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if parsing fails
      
      // Format: DD.MM.YYYY HH:MM (German format)
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Fehler beim Formatieren des Datums:', error);
      return dateString; // Return original if any error occurs
    }
  };
  
  const [formData, setFormData] = useState({
    craftsman_id: '',
    customer_id: '',
    amount: '',
    tax_amount: '',
    total_amount: '',
    notes: '',
    due_date: '',
    service_date: '',
    location: '',
    vat_exempt: false,
    type: 'quote', // Default to quote type
    appointment_id: ''
  });
  
  const [customers, setCustomers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [createdQuote, setCreatedQuote] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Get craftsman ID from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        console.log('Token-Daten:', tokenData);
        
        // Check for craftsmanId in different possible formats
        let extractedCraftsmanId = null;
        if (tokenData.craftsmanId) {
          extractedCraftsmanId = tokenData.craftsmanId;
        } else if (tokenData.craftsman_id) {
          extractedCraftsmanId = tokenData.craftsman_id;
        } else if (tokenData.user && tokenData.user.craftsmanId) {
          extractedCraftsmanId = tokenData.user.craftsmanId;
        } else if (tokenData.user && tokenData.user.craftsman_id) {
          extractedCraftsmanId = tokenData.user.craftsman_id;
        }
        
        console.log('Extrahierte Handwerker-ID:', extractedCraftsmanId);
        
        if (extractedCraftsmanId) {
          setFormData(prev => ({ ...prev, craftsman_id: String(extractedCraftsmanId) }));
          fetchCustomers(extractedCraftsmanId);
          fetchAppointments(extractedCraftsmanId);
          
          // Check URL for pre-populated data from appointment
          if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            
            if (urlParams.get('from_appointment') === 'true') {
              console.log('Vorausfüllen des Angebots mit Termin-Daten');
              
              // Get appointment data from URL parameters
              const appointmentId = urlParams.get('appointment_id');
              const customerId = urlParams.get('customer_id');
              const amount = urlParams.get('amount');
              const location = urlParams.get('location');
              const serviceDate = urlParams.get('service_date');
              const notes = urlParams.get('notes');
              
              // Calculate default due date (30 days from now for quotes)
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + 30);
              const formattedDueDate = dueDate.toISOString().split('T')[0];
              
              // Calculate tax (19% of amount)
              const amountValue = parseFloat(amount) || 0;
              const taxAmount = (amountValue * 0.19).toFixed(2);
              const totalAmount = (amountValue + parseFloat(taxAmount)).toFixed(2);
              
              // Update form data with appointment details
              setFormData(prev => ({
                ...prev,
                appointment_id: appointmentId || '',
                customer_id: customerId || '',
                amount: amount || '',
                tax_amount: taxAmount,
                total_amount: totalAmount,
                due_date: formattedDueDate,
                service_date: serviceDate || '',
                location: location || '',
                notes: notes || ''
              }));
            } else {
              // Set default due date to 30 days from today for quotes
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + 30);
              const formattedDueDate = dueDate.toISOString().split('T')[0];
              
              setFormData(prev => ({
                ...prev,
                due_date: formattedDueDate
              }));
            }
          }
        } else {
          console.error('Keine Handwerker-ID in Ihrem Konto gefunden. Bitte wenden Sie sich an den Support.');
          setError('Keine Handwerker-ID in Ihrem Konto gefunden. Bitte wenden Sie sich an den Support.');
        }
      } catch (err) {
        console.error('Fehler beim Parsen des Tokens:', err);
        setError('Fehler bei der Authentifizierung Ihres Kontos. Bitte versuchen Sie es erneut.');
      }
    } else {
      console.error('Kein Token in localStorage gefunden');
      setError('Sie sind nicht angemeldet. Bitte melden Sie sich an, um Angebote zu erstellen.');
      router.push('/auth/login');
    }
  }, [router]);

  const fetchCustomers = async (craftsmanId) => {
    try {
      setLoading(true);
      const data = await customersAPI.getAll({ craftsman_id: craftsmanId });
      console.log('Kunden geladen:', data);
      setCustomers(data);
    } catch (err) {
      console.error('Fehler beim Laden der Kunden:', err);
      setError('Kunden konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async (craftsmanId) => {
    try {
      setLoadingAppointments(true);
      // Fetch all appointments for this craftsman without filtering by status or invoice association
      const data = await appointmentsAPI.getAll({ 
        craftsman_id: craftsmanId
      });
      console.log('Termine geladen:', data);
      setAppointments(data);
    } catch (err) {
      console.error('Fehler beim Laden der Termine:', err);
      // Non-critical error, don't set error state to avoid blocking quote creation
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // For checkbox fields, use the checked property
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Special handling for amount to auto-calculate tax and total
    if (name === 'amount') {
      const amount = parseFloat(value) || 0;
      let taxAmount = 0;
      
      // Check if VAT exempt
      if (!formData.vat_exempt) {
        // Calculate tax as 19% of the amount
        taxAmount = amount * 0.19;
      }
      
      const totalAmount = amount + taxAmount;
      
      setFormData(prev => ({
        ...prev,
        tax_amount: taxAmount.toFixed(2),
        total_amount: totalAmount.toFixed(2)
      }));
    }
    
    // Special handling for vat_exempt to recalculate tax and total
    if (name === 'vat_exempt') {
      const amount = parseFloat(formData.amount) || 0;
      let taxAmount = 0;
      
      // Calculate tax only if not VAT exempt
      if (!checked) {
        taxAmount = amount * 0.19;
      }
      
      const totalAmount = amount + taxAmount;
      
      setFormData(prev => ({
        ...prev,
        tax_amount: taxAmount.toFixed(2),
        total_amount: totalAmount.toFixed(2)
      }));
    }
  };

  const handleAppointmentChange = (e) => {
    const appointmentId = e.target.value;
    
    // If no appointment is selected, do nothing
    if (!appointmentId) {
      setSelectedAppointment(null);
      return;
    }
    
    // Find the appointment in the list
    const appointment = appointments.find(app => app.id.toString() === appointmentId);
    if (appointment) {
      setSelectedAppointment(appointment);
      
      // Pre-fill form fields with appointment data
      const amount = appointment.price || 0;
      const taxAmount = formData.vat_exempt ? 0 : (amount * 0.19).toFixed(2);
      const totalAmount = (parseFloat(amount) + parseFloat(taxAmount)).toFixed(2);
      
      setFormData(prev => ({
        ...prev,
        appointment_id: appointmentId,
        customer_id: appointment.customer_id || prev.customer_id,
        amount: amount.toString(),
        tax_amount: taxAmount,
        total_amount: totalAmount,
        service_date: appointment.date || prev.service_date,
        location: appointment.location || prev.location,
        notes: `Für Leistung am ${appointment.date}: ${appointment.service_type || 'Service'}${prev.notes ? `\n\n${prev.notes}` : ''}`
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Ensure all required fields are filled
      const requiredFields = ['craftsman_id', 'customer_id', 'amount', 'total_amount'];
      for (const field of requiredFields) {
        if (!formData[field]) {
          const fieldNames = {
            'craftsman_id': 'Handwerker-ID',
            'customer_id': 'Kunde',
            'amount': 'Betrag',
            'total_amount': 'Gesamtbetrag'
          };
          setError(`${fieldNames[field]} ist erforderlich`);
          setSubmitting(false);
          return;
        }
      }
      
      console.log('Angebotsdaten werden übermittelt:', formData);
      
      // Create the quote
      const quote = await quotesAPI.create(formData);
      
      console.log('Angebot erfolgreich erstellt:', quote);
      setCreatedQuote(quote);
      setSuccess(true);
      
      // Clear form data
      setFormData({
        craftsman_id: formData.craftsman_id, // Keep craftsman_id
        customer_id: '',
        amount: '',
        tax_amount: '',
        total_amount: '',
        notes: '',
        due_date: '',
        service_date: '',
        location: '',
        vat_exempt: false,
        type: 'quote',
        appointment_id: ''
      });
      
      // Redirect to quotes page after 2 seconds
      setTimeout(() => {
        router.push('/quotes');
      }, 2000);
    } catch (err) {
      console.error('Fehler beim Erstellen des Angebots:', err);
      setError('Angebot konnte nicht erstellt werden. Bitte versuchen Sie es später erneut.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!createdQuote) return;
    
    try {
      setPdfLoading(true);
      
      // Generate PDF for created quote
      await quotesAPI.generatePdf(createdQuote);
      
      console.log('PDF erfolgreich erstellt');
    } catch (err) {
      console.error('Fehler beim Erstellen des PDFs:', err);
      setError('PDF konnte nicht erstellt werden. Bitte versuchen Sie es später erneut.');
    } finally {
      setPdfLoading(false);
    }
  };
  
  const handleRedirectToQuotes = () => {
    router.push('/quotes');
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-b from-[#121212] to-[#1a1a1a] text-white">
        <main className="container mx-auto px-4 py-8">
          {/* Page Title and Back Link */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Neues Angebot erstellen</h1>
              <p className="text-gray-400">Füllen Sie das Formular aus, um ein neues Angebot zu erstellen</p>
            </div>
            <Link 
              href="/quotes" 
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
            >
              Zurück zu den Angeboten
            </Link>
          </div>

          {/* Success Message */}
          {success && createdQuote && (
            <div className="bg-green-900/50 border border-green-500 text-white p-4 rounded-xl mb-6">
              <h2 className="font-bold text-lg mb-2">Angebot erfolgreich erstellt!</h2>
              <p className="mb-4">Ihr Angebot wurde erfolgreich erstellt und im System gespeichert.</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleGeneratePdf}
                  disabled={pdfLoading}
                  className={`px-4 py-2 ${pdfLoading ? 'bg-gray-600 cursor-not-allowed' : 'bg-[#ffcb00] hover:bg-[#e6b800]'} text-black font-semibold rounded-xl transition-colors flex items-center justify-center`}
                >
                  {pdfLoading ? (
                    <>
                      <span className="mr-2 h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                      PDF wird erstellt...
                    </>
                  ) : (
                    'PDF erstellen'
                  )}
                </button>
                <button
                  onClick={handleRedirectToQuotes}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
                >
                  Alle Angebote anzeigen
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-white p-4 rounded-xl mb-6">
              <h2 className="font-bold text-lg mb-2">Fehler</h2>
              <p>{error}</p>
            </div>
          )}

          {/* Form Container */}
          {!success && (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <form onSubmit={handleSubmit}>
                {/* Appointment Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-1">
                    Termin auswählen (Optional)
                  </label>
                  <div className="relative">
                    <select
                      name="appointment_id"
                      value={formData.appointment_id}
                      onChange={handleAppointmentChange}
                      className="w-full bg-[#1e3a5f] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#ffcb00] appearance-none"
                      disabled={loadingAppointments || success}
                    >
                      <option value="">-- Termin auswählen --</option>
                      {appointments.map(appointment => (
                        <option key={appointment.id} value={appointment.id}>
                          {formatAppointmentDate(appointment.date)} - {appointment.customer_name || 'Kein Kundenname'}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  {loadingAppointments && (
                    <p className="text-sm text-gray-400 mt-1 flex items-center">
                      <span className="mr-2 h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                      Termine werden geladen...
                    </p>
                  )}
                </div>

                {/* Selected Appointment Card */}
                {selectedAppointment && (
                  <div className="mb-6 p-4 bg-[#1e3a5f]/50 rounded-xl border border-white/10">
                    <h3 className="font-medium mb-2">Ausgewählter Termin</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Datum:</span> {formatAppointmentDate(selectedAppointment.date)}
                      </div>
                      <div>
                        <span className="text-gray-400">Kunde:</span> {selectedAppointment.customer_name || 'Nicht angegeben'}
                      </div>
                      <div>
                        <span className="text-gray-400">Ort:</span> {selectedAppointment.location || 'Nicht angegeben'}
                      </div>
                      <div>
                        <span className="text-gray-400">Status:</span> {selectedAppointment.status || 'Nicht angegeben'}
                      </div>
                      {selectedAppointment.notes && (
                        <div className="col-span-1 md:col-span-2">
                          <span className="text-gray-400">Notizen:</span> {selectedAppointment.notes}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Selection */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      Kunde *
                    </label>
                    <div className="relative">
                      <select
                        name="customer_id"
                        value={formData.customer_id}
                        onChange={handleChange}
                        className="w-full bg-[#1e3a5f] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#ffcb00] appearance-none"
                        required
                        disabled={loading || success}
                      >
                        <option value="">-- Kunde auswählen --</option>
                        {customers.map(customer => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name} {customer.email ? `(${customer.email})` : ''}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    {loading && (
                      <p className="text-sm text-gray-400 mt-1 flex items-center">
                        <span className="mr-2 h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                        Kunden werden geladen...
                      </p>
                    )}
                  </div>

                  {/* Service Date */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Leistungsdatum
                    </label>
                    <input
                      type="date"
                      name="service_date"
                      value={formData.service_date}
                      onChange={handleChange}
                      className="w-full bg-[#1e3a5f] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#ffcb00]"
                      disabled={success}
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Ort
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full bg-[#1e3a5f] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#ffcb00]"
                      disabled={success}
                    />
                  </div>

                  {/* VAT Exempt Checkbox */}
                  <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="vat_exempt"
                        name="vat_exempt"
                        checked={formData.vat_exempt}
                        onChange={(e) => setFormData({...formData, vat_exempt: e.target.checked})}
                        className="h-5 w-5 text-[#ffcb00] focus:ring-[#ffcb00] border-white/30 rounded"
                        disabled={success}
                      />
                      <label htmlFor="vat_exempt" className="ml-2 block text-sm">
                        MwSt. befreit (keine Steuer wird berechnet)
                      </label>
                    </div>
                  </div>

                  {/* Amount (Net) */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Betrag (Netto) *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        €
                      </span>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className="w-full bg-[#1e3a5f] border border-white/10 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#ffcb00]"
                        required
                        disabled={success}
                      />
                    </div>
                  </div>

                  {/* Tax Amount (calculated) */}
                  {!formData.vat_exempt && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Steuerbetrag (19% MwSt.)
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                          €
                        </span>
                        <input
                          type="number"
                          name="tax_amount"
                          value={formData.tax_amount}
                          onChange={handleChange}
                          step="0.01"
                          min="0"
                          className="w-full bg-[#1e3a5f] border border-white/10 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#ffcb00]"
                          disabled={success}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Automatisch berechnet als 19% des Betrags
                      </p>
                    </div>
                  )}
                  
                  {/* Total Amount (calculated) */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Gesamtbetrag (Brutto) *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        €
                      </span>
                      <input
                        type="number"
                        name="total_amount"
                        value={formData.total_amount}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className="w-full bg-[#1e3a5f] border border-white/10 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#ffcb00]"
                        required
                        readOnly
                        disabled={success}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Automatisch berechnet aus Betrag + Steuer
                    </p>
                  </div>
                  
                  {/* Due Date */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Gültig bis
                    </label>
                    <input
                      type="date"
                      name="due_date"
                      value={formData.due_date}
                      onChange={handleChange}
                      className="w-full bg-[#1e3a5f] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#ffcb00]"
                      disabled={success}
                    />
                  </div>
                  
                  {/* Notes */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      Notizen
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows="4"
                      className="w-full bg-[#1e3a5f] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#ffcb00]"
                      disabled={success}
                    ></textarea>
                  </div>
                </div>
                
                {/* Submit Button */}
                <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting || loading || !formData.customer_id || !formData.amount} // Disable on submit/load/missing required fields
                    className={`px-6 py-2.5 ${submitting ? 'bg-gray-600 cursor-not-allowed' : 'bg-[#ffcb00] hover:bg-[#e6b800]'} text-black font-semibold rounded-xl transition-colors flex items-center justify-center disabled:opacity-60`}
                    style={{ minWidth: '150px' }} // Ensure minimum width
                  >
                    {submitting ? (
                      <>
                        <span className="mr-2 h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                        Angebot wird erstellt...
                      </>
                    ) : (
                      'Angebot erstellen'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}
