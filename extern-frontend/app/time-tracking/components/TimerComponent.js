'use client';

import { useState, useEffect, useRef } from 'react';
import { Clock, Play, Pause, Square, Coffee, Save, CheckSquare, AlertTriangle } from 'react-feather';

const TimerComponent = ({ onSaveTimeEntry, appointments }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [startTime, setStartTime] = useState(null);
  const [description, setDescription] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [breaks, setBreaks] = useState([]);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [currentBreakStart, setCurrentBreakStart] = useState(null);
  const [breakDescription, setBreakDescription] = useState('');
  const [showBreaksPanel, setShowBreaksPanel] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertLevel, setAlertLevel] = useState(''); // 'warning' or 'error'
  
  const timerRef = useRef(null);
  const longRunningTimerRef = useRef(null);

  // Format time as HH:MM:SS
  const formatTime = (timeInSeconds) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  };

  // Calculate total break time in seconds
  const getTotalBreakTime = () => {
    return breaks.reduce((total, breakItem) => {
      return total + (breakItem.endTime - breakItem.startTime) / 1000;
    }, 0);
  };

  // Calculate net working time (elapsed time minus break time)
  const getNetWorkingTime = () => {
    const totalBreakTimeSeconds = getTotalBreakTime();
    return elapsedTime - totalBreakTimeSeconds;
  };

  // Start the timer
  const startTimer = () => {
    if (isRunning && !isPaused) return;
    
    if (!startTime) {
      const now = new Date();
      setStartTime(now);
    }
    
    setIsRunning(true);
    setIsPaused(false);
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Set new timer that updates elapsed time every second
    const startTimestamp = Date.now() - (elapsedTime * 1000);
    timerRef.current = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
      setElapsedTime(elapsedSeconds);
      
      // Check for long-running timers (every minute)
      if (elapsedSeconds % 60 === 0) {
        checkLongRunningTimer(elapsedSeconds);
      }
    }, 1000);
    
    // Remove any previous notifications
    setShowNotification(false);
  };

  // Pause the timer
  const pauseTimer = () => {
    if (!isRunning || isPaused) return;
    
    setIsPaused(true);
    clearInterval(timerRef.current);
  };

  // Stop the timer and prepare for saving
  const stopTimer = () => {
    if (!isRunning) return;
    
    // If currently on break, end the break
    if (isOnBreak && currentBreakStart) {
      endBreak();
    }
    
    // Stop the timer
    clearInterval(timerRef.current);
    setIsRunning(false);
    
    // Clear the long running timer check
    if (longRunningTimerRef.current) {
      clearTimeout(longRunningTimerRef.current);
    }
  };

  // Reset the timer and all states
  const resetTimer = () => {
    clearInterval(timerRef.current);
    setIsRunning(false);
    setIsPaused(false);
    setElapsedTime(0);
    setStartTime(null);
    setDescription('');
    setSelectedAppointment(null);
    setBreaks([]);
    setIsOnBreak(false);
    setCurrentBreakStart(null);
    setBreakDescription('');
    setShowBreaksPanel(false);
    setShowNotification(false);
    setAlertMessage('');
  };

  // Start a break
  const startBreak = () => {
    if (!isRunning) return;
    
    const now = new Date();
    setIsOnBreak(true);
    setCurrentBreakStart(now);
    setBreakDescription('Pause');
    setShowBreaksPanel(true);
  };

  // End the current break
  const endBreak = () => {
    if (!isOnBreak || !currentBreakStart) return;
    
    const now = new Date();
    const newBreak = {
      id: Date.now().toString(),
      startTime: currentBreakStart.getTime(),
      endTime: now.getTime(),
      duration: (now.getTime() - currentBreakStart.getTime()) / 1000, // in seconds
      description: breakDescription || 'Pause'
    };
    
    setBreaks([...breaks, newBreak]);
    setIsOnBreak(false);
    setCurrentBreakStart(null);
    setBreakDescription('');
  };

  // Delete a break from the list
  const deleteBreak = (breakId) => {
    setBreaks(breaks.filter(breakItem => breakItem.id !== breakId));
  };

  // Check for long-running timer
  const checkLongRunningTimer = (elapsedSeconds) => {
    // Notify after 3 hours (10800 seconds)
    if (elapsedSeconds >= 10800 && elapsedSeconds % 3600 === 0) { // Check every hour after 3 hours
      setAlertMessage(`Timer läuft seit ${Math.floor(elapsedSeconds / 3600)} Stunden. Möchten Sie ihn beenden?`);
      setAlertLevel('warning');
      setShowNotification(true);
    }
  };

  // Save the time entry
  const saveTimeEntry = async () => {
    if (!startTime) return;
    
    const endTime = new Date();
    const netWorkingTimeSeconds = getNetWorkingTime();
    
    // Don't save entries less than 1 minute
    if (netWorkingTimeSeconds < 60) {
      setAlertMessage('Zeit zu kurz zum Speichern (weniger als 1 Minute)');
      setAlertLevel('error');
      setShowNotification(true);
      return;
    }
    
    // Create the time entry object
    const timeEntry = {
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      description: description || 'Zeiterfassung mit Timer',
      duration_minutes: Math.round(netWorkingTimeSeconds / 60),
      appointment_id: selectedAppointment,
      breaks: breaks.map(breakItem => ({
        start_time: new Date(breakItem.startTime).toISOString(),
        end_time: new Date(breakItem.endTime).toISOString(),
        description: breakItem.description
      }))
    };
    
    // Call the provided save function
    try {
      await onSaveTimeEntry(timeEntry);
      resetTimer();
    } catch (error) {
      console.error('Error saving time entry:', error);
      setAlertMessage('Fehler beim Speichern des Zeiteintrags');
      setAlertLevel('error');
      setShowNotification(true);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (longRunningTimerRef.current) {
        clearTimeout(longRunningTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-6 shadow-lg border border-white/10 animate-fade-in-up">
      {/* Timer display */}
      <div className="flex flex-col items-center mb-8">
        <div className="text-6xl font-mono font-bold text-white mb-2">
          {formatTime(getNetWorkingTime())}
        </div>
        <div className="text-white/60 text-sm">
          {startTime ? (
            <span>Gestartet: {startTime.toLocaleTimeString()}</span>
          ) : (
            <span>Bereit zum Starten</span>
          )}
          {breaks.length > 0 && (
            <span className="ml-2">| Pausen: {formatTime(getTotalBreakTime())}</span>
          )}
        </div>
      </div>
      
      {/* Timer controls */}
      <div className="flex justify-center space-x-4 mb-8">
        {!isRunning || isPaused ? (
          <button
            onClick={startTimer}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-all"
          >
            <Play size={18} className="mr-2" />
            {isPaused ? 'Fortsetzen' : 'Start'}
          </button>
        ) : (
          <button
            onClick={pauseTimer}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center transition-all"
          >
            <Pause size={18} className="mr-2" />
            Pause
          </button>
        )}
        
        <button
          onClick={stopTimer}
          className={`${
            isRunning
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-600 hover:bg-gray-700 text-white/60'
          } px-4 py-2 rounded-lg flex items-center transition-all`}
          disabled={!isRunning}
        >
          <Square size={18} className="mr-2" />
          Stop
        </button>
        
        {isRunning && !isOnBreak && (
          <button
            onClick={startBreak}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-all"
          >
            <Coffee size={18} className="mr-2" />
            Pause starten
          </button>
        )}
        
        {isOnBreak && (
          <button
            onClick={endBreak}
            className="bg-[#ffcb00] hover:bg-[#e0b200] text-black px-4 py-2 rounded-lg flex items-center transition-all"
          >
            <CheckSquare size={18} className="mr-2" />
            Pause beenden
          </button>
        )}
      </div>
      
      {/* Entry details when timer is stopped */}
      {!isRunning && elapsedTime > 0 && (
        <div className="mb-6">
          <h3 className="text-white font-medium mb-4">Zeiterfassung speichern</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-white/70 text-sm mb-1">Beschreibung</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreibung der Tätigkeit"
                className="w-full bg-[#121212] border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#ffcb00]/50 focus:border-[#ffcb00]"
              />
            </div>
            
            {appointments && appointments.length > 0 && (
              <div>
                <label className="block text-white/70 text-sm mb-1">Termin verknüpfen (optional)</label>
                <select
                  value={selectedAppointment || ''}
                  onChange={(e) => setSelectedAppointment(e.target.value || null)}
                  className="w-full bg-[#121212] border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ffcb00]/50 focus:border-[#ffcb00]"
                >
                  <option value="">Keinen Termin auswählen</option>
                  {appointments.map((appointment) => (
                    <option key={appointment.id} value={appointment.id}>
                      {new Date(appointment.date).toLocaleDateString()} - {appointment.title || appointment.customer.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <button
              onClick={saveTimeEntry}
              className="bg-[#ffcb00] hover:bg-[#e0b200] text-black px-4 py-2 rounded-lg w-full flex items-center justify-center transition-all"
            >
              <Save size={18} className="mr-2" />
              Zeiteintrag speichern
            </button>
          </div>
        </div>
      )}
      
      {/* Breaks panel */}
      {(showBreaksPanel || isOnBreak || breaks.length > 0) && (
        <div className="mt-8">
          <h3 className="text-white font-medium mb-3 flex items-center">
            <Coffee size={18} className="mr-2" /> Pausen ({breaks.length})
          </h3>
          
          {isOnBreak && (
            <div className="mb-4 bg-blue-900/30 border border-blue-800/30 rounded-lg p-4">
              <div className="flex justify-between mb-2">
                <span className="text-blue-300 text-sm">Laufende Pause</span>
                <span className="text-blue-200">
                  {currentBreakStart ? currentBreakStart.toLocaleTimeString() : ''} - jetzt
                </span>
              </div>
              <input
                type="text"
                value={breakDescription}
                onChange={(e) => setBreakDescription(e.target.value)}
                placeholder="Pausenbeschreibung (optional)"
                className="w-full bg-[#121212] border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#ffcb00]/50 focus:border-[#ffcb00]"
              />
            </div>
          )}
          
          {breaks.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-2">
              {breaks.map((breakItem) => (
                <div 
                  key={breakItem.id}
                  className="bg-[#121212] border border-white/10 rounded-lg p-3 flex justify-between items-center"
                >
                  <div className="flex-1">
                    <div className="text-white text-sm">{breakItem.description}</div>
                    <div className="text-white/60 text-xs">
                      {new Date(breakItem.startTime).toLocaleTimeString()} - {new Date(breakItem.endTime).toLocaleTimeString()}
                      <span className="ml-2">({Math.round(breakItem.duration / 60)} min)</span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteBreak(breakItem.id)}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Notification/alert banner */}
      {showNotification && (
        <div className={`mt-6 p-4 rounded-lg flex items-start ${
          alertLevel === 'warning' ? 'bg-amber-900/30 border border-amber-800/30 text-amber-300' : 'bg-red-900/30 border border-red-800/30 text-red-300'
        }`}>
          <AlertTriangle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            {alertMessage}
          </div>
          <button 
            onClick={() => setShowNotification(false)}
            className="text-white/60 hover:text-white ml-2"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default TimerComponent;
