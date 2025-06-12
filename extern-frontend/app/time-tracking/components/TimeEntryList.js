'use client';

import { useState } from 'react';
import { formatDistanceToNow, parseISO, format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { de } from 'date-fns/locale';
import { Edit2, Trash2, Clock, Calendar, User, FileText, DollarSign } from 'react-feather';
import { timeEntriesAPI } from '../../lib/api';

export default function TimeEntryList({ timeEntries, onEdit, onDelete, filter, appointments }) {
  const [confirmDelete, setConfirmDelete] = useState(null);

  const getFilteredEntries = () => {
    if (!timeEntries.length) return [];
    
    const today = new Date();
    
    switch (filter) {
      case 'recent':
        const sevenDaysAgo = subDays(today, 7);
        return timeEntries.filter(entry => {
          const entryDate = parseISO(entry.start_time);
          return entryDate >= sevenDaysAgo;
        });
      
      case 'week':
        const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
        return timeEntries.filter(entry => {
          const entryDate = parseISO(entry.start_time);
          return isWithinInterval(entryDate, { start: weekStart, end: weekEnd });
        });
      
      case 'month':
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        return timeEntries.filter(entry => {
          const entryDate = parseISO(entry.start_time);
          return isWithinInterval(entryDate, { start: monthStart, end: monthEnd });
        });
      
      case 'all':
      default:
        return timeEntries;
    }
  };

  const formatTimeRange = (start, end) => {
    try {
      const startDate = parseISO(start);
      const startStr = format(startDate, 'dd.MM.yyyy, HH:mm', { locale: de });
      
      if (end) {
        const endDate = parseISO(end);
        const sameDay = format(startDate, 'dd.MM.yyyy') === format(endDate, 'dd.MM.yyyy');
        
        if (sameDay) {
          // If same day, only show the time for end
          return `${startStr} - ${format(endDate, 'HH:mm', { locale: de })} Uhr`;
        } else {
          // If different days, show full date and time
          return `${startStr} - ${format(endDate, 'dd.MM.yyyy, HH:mm', { locale: de })} Uhr`;
        }
      }
      
      return startStr;
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };
  
  const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return 'N/A';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    return `${hours}:${mins.toString().padStart(2, '0')} h`;
  };
  
  const formatBillableAmount = (amount) => {
    if (!amount && amount !== 0) return 'N/A';
    
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getAppointmentInfo = (appointmentId) => {
    if (!appointmentId) return null;
    return appointments.find(app => app.id === appointmentId);
  };

  const handleDeleteClick = async (entryId) => {
    if (confirmDelete === entryId) {
      try {
        console.log(`Deleting time entry with ID: ${entryId}`);
        
        // Use the centralized timeEntriesAPI to delete the entry
        await timeEntriesAPI.delete(entryId);
        
        console.log(`Time entry with ID: ${entryId} deleted successfully`);
        onDelete(entryId);
        setConfirmDelete(null);
      } catch (err) {
        console.error('Error deleting time entry:', err);
        alert(`Fehler beim Löschen des Zeiteintrags: ${err.message}`);
      }
    } else {
      setConfirmDelete(entryId);
      
      // Auto-reset confirm state after 3 seconds
      setTimeout(() => {
        setConfirmDelete(null);
      }, 3000);
    }
  };

  const filteredEntries = getFilteredEntries();
  
  if (!filteredEntries.length) {
    return (
      <div className="bg-[#1a1a1a] rounded-xl border border-white/10 p-6 shadow-lg">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
            <Clock size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Keine Zeiteinträge gefunden</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            Für den ausgewählten Zeitraum wurden keine Einträge gefunden. Erstellen Sie einen neuen Zeiteintrag oder wählen Sie einen anderen Filter.
          </p>
          <button
            onClick={() => onEdit(null)}
            className="mt-6 px-6 py-3 bg-[#ffcb00] text-black rounded-lg hover:bg-[#e6b800] transition-all inline-flex items-center"
          >
            <Clock className="mr-2" size={18} />
            Neuen Zeiteintrag erstellen
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-white/10 shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Datum & Zeit
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Dauer
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Kunde/Termin
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Beschreibung
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Abrechenbar
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="bg-[#1a1a1a] divide-y divide-white/10">
            {filteredEntries.map((entry) => {
              const appointmentInfo = getAppointmentInfo(entry.appointment_id);
              
              return (
                <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">{formatTimeRange(entry.start_time, entry.end_time)}</div>
                    <div className="text-xs text-gray-400">
                      {entry.end_time && formatDistanceToNow(parseISO(entry.end_time), { addSuffix: true, locale: de })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 inline-flex text-sm leading-5 font-medium rounded-full bg-blue-900/20 text-blue-300">
                      {formatDuration(entry.duration_minutes)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {appointmentInfo ? (
                      <div>
                        <div className="text-sm text-white flex items-center">
                          <User size={14} className="mr-1.5 text-gray-400" />
                          {appointmentInfo.customer_name}
                        </div>
                        <div className="text-xs text-gray-400 flex items-center mt-1">
                          <Calendar size={12} className="mr-1" />
                          {appointmentInfo.title || 'Termin'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white">{entry.description || 'Keine Beschreibung'}</div>
                    {entry.notes && (
                      <div className="text-xs text-gray-400 mt-1 flex items-center">
                        <FileText size={12} className="mr-1" />
                        {entry.notes.substring(0, 30)}{entry.notes.length > 30 ? '...' : ''}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {entry.billable ? (
                      <div>
                        <div className="flex items-center text-sm text-white">
                          <DollarSign size={14} className="mr-1 text-green-400" />
                          {formatBillableAmount(entry.billable_amount)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {entry.hourly_rate ? `${entry.hourly_rate}€/h` : ''}
                        </div>
                      </div>
                    ) : (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-gray-800 text-gray-400">
                        Nicht abrechenbar
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => onEdit(entry)}
                        className="text-yellow-500 hover:text-yellow-400 transition-colors p-1.5"
                        title="Bearbeiten"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(entry.id)}
                        className={`${
                          confirmDelete === entry.id
                            ? 'bg-red-600 text-white'
                            : 'text-red-500 hover:text-red-400'
                        } transition-colors p-1.5 rounded`}
                        title={confirmDelete === entry.id ? 'Löschen bestätigen' : 'Löschen'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
