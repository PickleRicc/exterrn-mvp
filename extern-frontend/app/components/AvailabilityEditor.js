"use client";
import { useState } from "react";

export default function AvailabilityEditor({ value, onChange, disabled }) {
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const dayLabels = {
    monday: "Montag",
    tuesday: "Dienstag",
    wednesday: "Mittwoch",
    thursday: "Donnerstag",
    friday: "Freitag",
    saturday: "Samstag",
    sunday: "Sonntag"
  };
  const timeSlots = [
    "6:00-14:00", "8:00-17:00", "9:00-17:00", "10:00-18:00", "12:00-20:00"
  ];

  // Local state to edit before saving
  const [localAvailability, setLocalAvailability] = useState(value || {
    monday: ["9:00-17:00"],
    tuesday: ["9:00-17:00"],
    wednesday: ["9:00-17:00"],
    thursday: ["9:00-17:00"],
    friday: ["9:00-17:00"],
    saturday: [],
    sunday: []
  });

  const handleChange = (day, idx, newSlot) => {
    const updated = { ...localAvailability };
    updated[day][idx] = newSlot;
    setLocalAvailability(updated);
    onChange && onChange(updated);
  };

  const handleAddSlot = (day) => {
    const updated = { ...localAvailability };
    updated[day] = [...updated[day], "9:00-17:00"];
    setLocalAvailability(updated);
    onChange && onChange(updated);
  };

  const handleRemoveSlot = (day, idx) => {
    const updated = { ...localAvailability };
    updated[day] = updated[day].filter((_, i) => i !== idx);
    setLocalAvailability(updated);
    onChange && onChange(updated);
  };

  return (
    <div className="space-y-3">
      {days.map((day) => (
        <div key={day} className="mb-2">
          <div className="font-medium mb-1">{dayLabels[day]}</div>
          <div className="flex flex-wrap gap-2">
            {localAvailability[day].map((slot, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <select
                  className="border rounded px-2 py-1"
                  value={slot}
                  disabled={disabled}
                  onChange={e => handleChange(day, idx, e.target.value)}
                >
                  {timeSlots.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {!disabled && (
                  <button
                    type="button"
                    className="text-red-500 text-xs"
                    onClick={() => handleRemoveSlot(day, idx)}
                  >Entfernen</button>
                )}
              </div>
            ))}
            {!disabled && (
              <button
                type="button"
                className="text-blue-600 text-xs border border-blue-200 rounded px-2 py-1"
                onClick={() => handleAddSlot(day)}
              >+ Zeitfenster</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
