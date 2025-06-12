'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { craftsmenAPI, timeEntriesAPI } from '../lib/api';
import TimeEntryList from './components/TimeEntryList';
import TimeEntryForm from './components/TimeEntryForm';
import TimerComponent from './components/TimerComponent';
import Link from 'next/link';
import { Calendar, Clock, List, PlusCircle } from 'react-feather';

export default function TimeTrackingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeEntries, setTimeEntries] = useState([]);
  const [craftsmanId, setCraftsmanId] = useState(null);
  const [activeView, setActiveView] = useState('list'); // 'list', 'form', 'timer'
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [filter, setFilter] = useState('recent'); // 'recent', 'week', 'month', 'all'
  const [appointments, setAppointments] = useState([]);

  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // Get craftsman ID from token - with improved error handling
    try {
      // Check token format first
      const parts = token.split('.');
      if (parts.length !== 3 || !parts[1]) {
        throw new Error('Invalid token format');
      }
      
      // Safely decode the token payload
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const pad = base64.length % 4;
      const paddedBase64 = pad ? base64 + '='.repeat(4 - pad) : base64;
      
      // Parse the token data
      let tokenData;
      try {
        const jsonPayload = atob(paddedBase64);
        tokenData = JSON.parse(jsonPayload);
      } catch (decodeError) {
        // Try alternate method if the first fails
        const jsonPayload = decodeURIComponent(
          atob(paddedBase64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        tokenData = JSON.parse(jsonPayload);
      }
      
      // Check if we have the craftsman ID
      if (tokenData?.craftsmanId) {
        setCraftsmanId(tokenData.craftsmanId);
        fetchData(tokenData.craftsmanId);
      } else {
        console.warn('No craftsman ID found in token');
        setError('Ihr Konto ist nicht als Handwerker eingerichtet. Bitte kontaktieren Sie den Support.');
        setLoading(false);
      }
    } catch (err) {
      console.debug('Error getting craftsman ID from token:', err.message);
      setError('Sitzungsfehler. Bitte melden Sie sich erneut an.');
      setLoading(false);
      
      // Redirect to login if token is completely invalid
      setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/auth/login');
      }, 2000); // Give user time to see the error message
    }
  }, [router]);

  const fetchData = async (craftsmanId) => {
    try {
      setLoading(true);
      
      // Ensure we have a valid craftsman ID
      if (!craftsmanId) {
        throw new Error('Keine gültige Handwerker-ID verfügbar');
      }
      
      console.log(`Fetching time entries for craftsman ID: ${craftsmanId}`);
      
      // Fetch time entries - with separate try/catch for better error reporting
      try {
        // Use the centralized timeEntriesAPI to fetch all time entries
        console.log('Using timeEntriesAPI.getAll() to fetch time entries');
        
        // Get all time entries and filter by craftsman ID client-side
        const timeEntriesData = await timeEntriesAPI.getAll();
        
        // Filter for the current craftsman on the client side
        if (Array.isArray(timeEntriesData)) {
          const filteredEntries = timeEntriesData.filter(entry => {
            return entry.craftsman_id === craftsmanId || 
                   entry.craftsman_id === parseInt(craftsmanId) ||
                   entry.craftsmanId === craftsmanId;
          });
          console.log(`Filtered from ${timeEntriesData.length} to ${filteredEntries.length} entries for craftsman ${craftsmanId}`);
          setTimeEntries(filteredEntries);
        } else {
          console.warn('Received non-array time entries data:', timeEntriesData);
          setTimeEntries([]);
        }
        
        console.log(`Received ${timeEntriesData?.length || 0} time entries`);
      } catch (timeEntriesErr) {
        // Detailed error reporting
        console.error('Error fetching time entries:', timeEntriesErr);
        console.error('Error name:', timeEntriesErr.name);
        console.error('Error message:', timeEntriesErr.message);
        console.error('Error stack:', timeEntriesErr.stack);
        
        setError(`Fehler beim Laden der Zeiteinträge: ${timeEntriesErr.message || 'Netzwerkfehler'}`);
        // Continue with appointments fetch anyway
      }
      
      // Also fetch appointments for linking - in a separate try/catch
      try {
        console.log('Fetching appointments...');
        const appointmentsData = await craftsmenAPI.getAppointments(craftsmanId);
        console.log(`Received ${appointmentsData?.length || 0} appointments`);
        setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
      } catch (appointmentsErr) {
        console.error('Error fetching appointments:', appointmentsErr);
        setError(prev => {
          const newError = `Fehler beim Laden der Termine: ${appointmentsErr.message}`;
          return prev ? `${prev}\n${newError}` : newError;
        });
        // Set a default empty array for appointments
        setAppointments([]);
      }
      
    } catch (err) {
      // This catches any errors that weren't caught in the nested try/catch blocks
      console.error('Global error in fetchData:', err);
      setError(`Ein Fehler ist aufgetreten: ${err.message}`);
    } finally {
      // Always stop loading, even if there were errors
      setLoading(false);
    }
  };

  const handleCreateSuccess = (newEntry) => {
    setTimeEntries([newEntry, ...timeEntries]);
    setActiveView('list');
    setSuccess('Zeiteintrag erfolgreich erstellt');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess('');
    }, 3000);
  };

  const handleUpdateSuccess = (updatedEntry) => {
    setTimeEntries(timeEntries.map(entry => 
      entry.id === updatedEntry.id ? updatedEntry : entry
    ));
    setSelectedEntry(null);
    setActiveView('list');
    setSuccess('Zeiteintrag erfolgreich aktualisiert');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess('');
    }, 3000);
  };

  const handleDeleteSuccess = (deletedId) => {
    setTimeEntries(timeEntries.filter(entry => entry.id !== deletedId));
    setSuccess('Zeiteintrag erfolgreich gelöscht');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess('');
    }, 3000);
  };

  const handleEditEntry = (entry) => {
    setSelectedEntry(entry);
    setActiveView('form');
  };
  
  const handleTimerEntrySubmit = async (timeEntryData) => {
    try {
      // Show loading state
      setLoading(true);
      
      // Data validation
      if (!craftsmanId) {
        throw new Error('Keine Handwerker-ID gefunden. Bitte erneut anmelden.');
      }
      
      // Add craftsman ID to the entry
      const entryWithCraftsmanId = {
        ...timeEntryData,
        craftsman_id: craftsmanId
      };
      
      console.log('Submitting time entry with data:', JSON.stringify(entryWithCraftsmanId, null, 2));
      
      // Use the centralized timeEntriesAPI to create the time entry
      const newEntry = await timeEntriesAPI.create(entryWithCraftsmanId);
      
      // Add the new entry to the list
      setTimeEntries([newEntry, ...timeEntries]);
      
      // Show success message
      setSuccess('Zeiteintrag mit Timer erfolgreich erstellt');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
      // Switch to list view
      setActiveView('list');
      
      // Return the created entry
      return newEntry;
    } catch (err) {
      console.error('Error creating time entry from timer:', err);
      setError(`Fehler beim Erstellen des Zeiteintrags: ${err.message || 'Unbekannter Fehler'}`);
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setError('');
      }, 5000);
      
      // Don't throw, just return null
      return null;
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'list':
        return (
          <TimeEntryList
            timeEntries={timeEntries}
            onEdit={handleEditEntry}
            onDelete={handleDeleteSuccess}
            filter={filter}
            appointments={appointments}
          />
        );
      case 'form':
        return (
          <TimeEntryForm
            craftsmanId={craftsmanId}
            entry={selectedEntry}
            onSuccess={selectedEntry ? handleUpdateSuccess : handleCreateSuccess}
            onCancel={() => {
              setSelectedEntry(null);
              setActiveView('list');
            }}
            appointments={appointments}
          />
        );
      case 'timer':
        return (
          <TimerComponent 
            onSaveTimeEntry={handleTimerEntrySubmit}
            appointments={appointments}
          />
        );
      default:
        return null;
    }
  };

  const renderFilterSelector = () => (
    <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => setFilter('recent')}
        className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
          filter === 'recent'
            ? 'bg-[#ffcb00] text-black font-medium'
            : 'bg-white/5 text-white/70 hover:bg-white/10'
        } transition-all`}
      >
        Letzte 7 Tage
      </button>
      <button
        onClick={() => setFilter('week')}
        className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
          filter === 'week'
            ? 'bg-[#ffcb00] text-black font-medium'
            : 'bg-white/5 text-white/70 hover:bg-white/10'
        } transition-all`}
      >
        Diese Woche
      </button>
      <button
        onClick={() => setFilter('month')}
        className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
          filter === 'month'
            ? 'bg-[#ffcb00] text-black font-medium'
            : 'bg-white/5 text-white/70 hover:bg-white/10'
        } transition-all`}
      >
        Diesen Monat
      </button>
      <button
        onClick={() => setFilter('all')}
        className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
          filter === 'all'
            ? 'bg-[#ffcb00] text-black font-medium'
            : 'bg-white/5 text-white/70 hover:bg-white/10'
        } transition-all`}
      >
        Alle Einträge
      </button>
    </div>
  );

  const renderNavTabs = () => (
    <div className="flex space-x-2 mb-6 border-b border-white/10 pb-4">
      <button
        onClick={() => {
          setActiveView('list');
          setSelectedEntry(null);
        }}
        className={`px-4 py-2 rounded-t-lg flex items-center ${
          activeView === 'list'
            ? 'bg-[#1a1a1a] text-[#ffcb00] border-b-2 border-[#ffcb00]'
            : 'text-white/70 hover:text-white hover:bg-white/5'
        } transition-all`}
      >
        <List size={16} className="mr-2" />
        Zeiteinträge
      </button>
      <button
        onClick={() => {
          setActiveView('form');
          setSelectedEntry(null);
        }}
        className={`px-4 py-2 rounded-t-lg flex items-center ${
          activeView === 'form' && !selectedEntry
            ? 'bg-[#1a1a1a] text-[#ffcb00] border-b-2 border-[#ffcb00]'
            : 'text-white/70 hover:text-white hover:bg-white/5'
        } transition-all`}
      >
        <PlusCircle size={16} className="mr-2" />
        Neuer Eintrag
      </button>
      <button
        onClick={() => {
          setActiveView('timer');
          setSelectedEntry(null);
        }}
        className={`px-4 py-2 rounded-t-lg flex items-center ${
          activeView === 'timer'
            ? 'bg-[#1a1a1a] text-[#ffcb00] border-b-2 border-[#ffcb00]'
            : 'text-white/70 hover:text-white hover:bg-white/5'
        } transition-all`}
      >
        <Clock size={16} className="mr-2" />
        Timer
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col">
      <Header title="Zeiterfassung" subtitle="Arbeitszeit verwalten und protokollieren" />
      
      <main className="flex-grow container mx-auto px-4 py-6">
        {/* Success message */}
        {success && (
          <div className="mb-4 p-4 bg-green-900/20 border border-green-900/30 rounded-lg text-green-400 animate-fade-in">
            {success}
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-900/30 rounded-lg text-red-400">
            {error}
            <button 
              className="ml-2 underline" 
              onClick={() => {
                setError('');
                if (craftsmanId) fetchData(craftsmanId);
              }}
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-[#ffcb00]/20 border-t-[#ffcb00] rounded-full animate-spin"></div>
            <p className="mt-4 text-white/60">Lade Zeiteinträge...</p>
          </div>
        ) : (
          <div className="animate-fade-in-up">
            {renderNavTabs()}
            
            {activeView === 'list' && renderFilterSelector()}
            
            {renderContent()}
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
