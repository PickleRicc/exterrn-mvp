'use client';

import { useState, useEffect } from 'react';
import { parseISO, format, addHours, isValid, differenceInMinutes } from 'date-fns';
import { Calendar, Clock, Save, X, User, FileText, DollarSign } from 'react-feather';

export default function TimeEntryForm({ craftsmanId, entry, onSuccess, onCancel, appointments }) {
  const isEditing = !!entry;
  
  // Initialize state with either entry data or defaults
  const [formData, setFormData] = useState({
    start_time: '',
    end_time: '',
    duration_minutes: '',
    description: '',
    notes: '',
    appointment_id: '',
    billable: true,
    hourly_rate: '',
    billable_amount: ''
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load data when editing an existing entry
  useEffect(() => {
    if (entry) {
      const startDateTime = entry.start_time ? parseISO(entry.start_time) : null;
      const endDateTime = entry.end_time ? parseISO(entry.end_time) : null;
      
      setFormData({
        start_time: startDateTime ? format(startDateTime, "yyyy-MM-dd'T'HH:mm") : '',
        end_time: endDateTime ? format(endDateTime, "yyyy-MM-dd'T'HH:mm") : '',
        duration_minutes: entry.duration_minutes || '',
        description: entry.description || '',
        notes: entry.notes || '',
        appointment_id: entry.appointment_id || '',
        billable: entry.billable !== undefined ? entry.billable : true,
        hourly_rate: entry.hourly_rate || '',
        billable_amount: entry.billable_amount || ''
      });
    } else {
      // For new entries, default to current time for start time
      const now = new Date();
      setFormData({
        ...formData,
        start_time: format(now, "yyyy-MM-dd'T'HH:mm"),
        // Default to 1 hour duration
        end_time: format(addHours(now, 1), "yyyy-MM-dd'T'HH:mm"),
        hourly_rate: '65' // Default hourly rate in EUR
      });
    }
  }, [entry]);

  // Calculate duration when start and end time change
  useEffect(() => {
    if (formData.start_time && formData.end_time) {
      const startDate = parseISO(formData.start_time);
      const endDate = parseISO(formData.end_time);
      
      if (isValid(startDate) && isValid(endDate)) {
        const durationInMinutes = differenceInMinutes(endDate, startDate);
        
        if (durationInMinutes > 0) {
          setFormData(prev => ({
            ...prev,
            duration_minutes: durationInMinutes
          }));
          
          // If billable is true and hourly rate is set, calculate billable amount
          if (formData.billable && formData.hourly_rate) {
            const hours = durationInMinutes / 60;
            const amount = hours * Number(formData.hourly_rate);
            setFormData(prev => ({
              ...prev,
              billable_amount: amount.toFixed(2)
            }));
          }
        }
      }
    }
  }, [formData.start_time, formData.end_time, formData.billable, formData.hourly_rate]);

  // Calculate billable amount when duration or hourly rate changes
  useEffect(() => {
    if (formData.billable && formData.hourly_rate && formData.duration_minutes) {
      const hours = Number(formData.duration_minutes) / 60;
      const amount = hours * Number(formData.hourly_rate);
      
      setFormData(prev => ({
        ...prev,
        billable_amount: amount.toFixed(2)
      }));
    } else if (!formData.billable) {
      setFormData(prev => ({
        ...prev,
        billable_amount: ''
      }));
    }
  }, [formData.duration_minutes, formData.hourly_rate, formData.billable]);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.start_time) {
      errors.start_time = 'Startzeit ist erforderlich';
    }
    
    if (formData.start_time && formData.end_time) {
      const startDate = parseISO(formData.start_time);
      const endDate = parseISO(formData.end_time);
      
      if (isValid(startDate) && isValid(endDate)) {
        if (endDate <= startDate) {
          errors.end_time = 'Endzeit muss nach der Startzeit liegen';
        }
      }
    }
    
    if (!formData.duration_minutes && !formData.end_time) {
      errors.duration_minutes = 'Dauer oder Endzeit ist erforderlich';
    }
    
    if (formData.duration_minutes && Number(formData.duration_minutes) <= 0) {
      errors.duration_minutes = 'Dauer muss positiv sein';
    }
    
    if (formData.billable) {
      if (!formData.hourly_rate) {
        errors.hourly_rate = 'Stundensatz ist erforderlich für abrechenbare Einträge';
      } else if (Number(formData.hourly_rate) <= 0) {
        errors.hourly_rate = 'Stundensatz muss positiv sein';
      }
    }
    
    return errors;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    // Clear error on change
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: undefined });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setIsSubmitting(true);
    
    // Prepare request data
    const requestData = {
      start_time: formData.start_time,
      end_time: formData.end_time || undefined,
      duration_minutes: formData.duration_minutes ? Number(formData.duration_minutes) : undefined,
      description: formData.description,
      notes: formData.notes || undefined,
      appointment_id: formData.appointment_id || undefined,
      billable: formData.billable,
      hourly_rate: formData.billable ? Number(formData.hourly_rate) : undefined,
      billable_amount: formData.billable ? Number(formData.billable_amount) : undefined,
      craftsman_id: craftsmanId
    };
    
    try {
      const url = isEditing 
        ? `${process.env.NEXT_PUBLIC_API_URL}/time-entries/${entry.id}` 
        : `${process.env.NEXT_PUBLIC_API_URL}/time-entries`;
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      onSuccess(data);
    } catch (err) {
      console.error('Error submitting time entry:', err);
      setFormErrors({ 
        submit: `Fehler beim ${isEditing ? 'Aktualisieren' : 'Erstellen'} des Zeiteintrags: ${err.message}` 
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-white/10 shadow-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">
        {isEditing ? 'Zeiteintrag bearbeiten' : 'Neuen Zeiteintrag erstellen'}
      </h2>
      
      {formErrors.submit && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-900/30 rounded-lg text-red-400">
          {formErrors.submit}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Date and Time */}
            <div className="mb-4">
              <h3 className="text-lg font-medium text-white mb-3">Zeitraum</h3>
              
              <div className="space-y-4">
                {/* Start Time */}
                <div>
                  <label htmlFor="start_time" className="block text-sm font-medium text-white/80 mb-2 flex items-center">
                    <Clock size={16} className="mr-2 text-[#ffcb00]" />
                    Startzeit
                  </label>
                  <input
                    type="datetime-local"
                    id="start_time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    className={`w-full p-3 border ${
                      formErrors.start_time ? 'border-red-500' : 'border-white/10'
                    } rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#ffcb00]/50 focus:border-[#ffcb00]/50 transition-all`}
                  />
                  {formErrors.start_time && (
                    <p className="mt-1 text-sm text-red-400">{formErrors.start_time}</p>
                  )}
                </div>
                
                {/* End Time */}
                <div>
                  <label htmlFor="end_time" className="block text-sm font-medium text-white/80 mb-2 flex items-center">
                    <Clock size={16} className="mr-2 text-[#ffcb00]" />
                    Endzeit
                  </label>
                  <input
                    type="datetime-local"
                    id="end_time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    className={`w-full p-3 border ${
                      formErrors.end_time ? 'border-red-500' : 'border-white/10'
                    } rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#ffcb00]/50 focus:border-[#ffcb00]/50 transition-all`}
                  />
                  {formErrors.end_time && (
                    <p className="mt-1 text-sm text-red-400">{formErrors.end_time}</p>
                  )}
                </div>
                
                {/* Duration */}
                <div>
                  <label htmlFor="duration_minutes" className="block text-sm font-medium text-white/80 mb-2 flex items-center">
                    <Clock size={16} className="mr-2 text-[#ffcb00]" />
                    Dauer (Minuten)
                  </label>
                  <input
                    type="number"
                    id="duration_minutes"
                    name="duration_minutes"
                    value={formData.duration_minutes}
                    onChange={handleInputChange}
                    placeholder="Wird automatisch berechnet"
                    className={`w-full p-3 border ${
                      formErrors.duration_minutes ? 'border-red-500' : 'border-white/10'
                    } rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#ffcb00]/50 focus:border-[#ffcb00]/50 transition-all`}
                  />
                  {formErrors.duration_minutes ? (
                    <p className="mt-1 text-sm text-red-400">{formErrors.duration_minutes}</p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-400">
                      Wird automatisch aus Start- und Endzeit berechnet.
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Appointment */}
            <div className="mb-4">
              <label htmlFor="appointment_id" className="block text-sm font-medium text-white/80 mb-2 flex items-center">
                <Calendar size={16} className="mr-2 text-[#ffcb00]" />
                Zugehöriger Termin (optional)
              </label>
              <select
                id="appointment_id"
                name="appointment_id"
                value={formData.appointment_id}
                onChange={handleInputChange}
                className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#ffcb00]/50 focus:border-[#ffcb00]/50 transition-all"
              >
                <option value="">Keinem Termin zugeordnet</option>
                {appointments && appointments.map(appointment => (
                  <option key={appointment.id} value={appointment.id}>
                    {appointment.title || 'Termin'} - {appointment.customer_name || 'Kunde'} ({format(parseISO(appointment.start_time), 'dd.MM.yyyy')})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Die Zuordnung zu einem Termin erleichtert die Nachverfolgung und Abrechnung.
              </p>
            </div>
          </div>
          
          {/* Right column */}
          <div className="space-y-6">
            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-white/80 mb-2 flex items-center">
                <FileText size={16} className="mr-2 text-[#ffcb00]" />
                Beschreibung
              </label>
              <input
                type="text"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Z.B. 'Badezimmerfliesen verlegen'"
                className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#ffcb00]/50 focus:border-[#ffcb00]/50 transition-all"
              />
            </div>
            
            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-white/80 mb-2 flex items-center">
                <FileText size={16} className="mr-2 text-[#ffcb00]" />
                Notizen (optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Zusätzliche Informationen zur durchgeführten Arbeit"
                className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#ffcb00]/50 focus:border-[#ffcb00]/50 transition-all"
              ></textarea>
            </div>
            
            {/* Billing information */}
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Abrechnung</h3>
              
              {/* Billable checkbox */}
              <div className="mb-4">
                <label className="flex items-center text-sm font-medium text-white/80">
                  <input
                    type="checkbox"
                    name="billable"
                    checked={formData.billable}
                    onChange={handleInputChange}
                    className="mr-2 w-4 h-4 accent-[#ffcb00]"
                  />
                  Abrechenbar
                </label>
              </div>
              
              {formData.billable && (
                <div className="space-y-4 pl-6 border-l-2 border-[#ffcb00]/30">
                  {/* Hourly Rate */}
                  <div>
                    <label htmlFor="hourly_rate" className="block text-sm font-medium text-white/80 mb-2 flex items-center">
                      <DollarSign size={16} className="mr-2 text-[#ffcb00]" />
                      Stundensatz (€)
                    </label>
                    <input
                      type="number"
                      id="hourly_rate"
                      name="hourly_rate"
                      value={formData.hourly_rate}
                      onChange={handleInputChange}
                      step="0.01"
                      className={`w-full p-3 border ${
                        formErrors.hourly_rate ? 'border-red-500' : 'border-white/10'
                      } rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-[#ffcb00]/50 focus:border-[#ffcb00]/50 transition-all`}
                    />
                    {formErrors.hourly_rate && (
                      <p className="mt-1 text-sm text-red-400">{formErrors.hourly_rate}</p>
                    )}
                  </div>
                  
                  {/* Billable Amount */}
                  <div>
                    <label htmlFor="billable_amount" className="block text-sm font-medium text-white/80 mb-2 flex items-center">
                      <DollarSign size={16} className="mr-2 text-[#ffcb00]" />
                      Rechnungsbetrag (€)
                    </label>
                    <input
                      type="number"
                      id="billable_amount"
                      name="billable_amount"
                      value={formData.billable_amount}
                      onChange={handleInputChange}
                      readOnly
                      className="w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white/60 focus:ring-2 focus:ring-[#ffcb00]/50 focus:border-[#ffcb00]/50 transition-all"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Wird automatisch basierend auf Dauer und Stundensatz berechnet.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Form Actions */}
        <div className="mt-8 flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-colors flex items-center"
          >
            <X size={18} className="mr-2" />
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-[#ffcb00] hover:bg-[#e6b800] text-black rounded-lg transition-colors flex items-center"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Speichern...
              </>
            ) : (
              <>
                <Save size={18} className="mr-2" />
                {isEditing ? 'Aktualisieren' : 'Speichern'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
