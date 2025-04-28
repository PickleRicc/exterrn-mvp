"use client";
import React, { useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

/**
 * @param {Object} props
 * @param {Array} props.appointments
 */
export default function CalendarView({ appointments }) {
  // Helper: get YYYY-MM-DD from date string
  function getDateKey(dateString) {
    return dateString.split('T')[0];
  }

  // Map appointments to calendar events (store both Date and string)
  const events = appointments.map((appt) => ({
    id: appt.id,
    title: appt.title || appt.subject || "Appointment",
    dateKey: appt.scheduled_at.split('T')[0],
    timeStr: appt.scheduled_at.split('T')[1]?.slice(0,5),
    start: new Date(appt.scheduled_at),
    end: new Date(appt.scheduled_at),
    resource: appt,
    raw: appt.scheduled_at,
  }));

  const [view, setView] = useState("month");
  const [date, setDate] = useState(new Date());

  // Month dropdown helper
  const months = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"
  ];
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 2; y <= currentYear + 3; y++) years.push(y);

  // Custom navigation handler
  const handleNavigate = (action) => {
    const current = new Date(date);
    if (action === "TODAY") {
      setDate(new Date());
    } else if (action === "PREV") {
      if (view === "month") current.setMonth(current.getMonth() - 1);
      if (view === "week") current.setDate(current.getDate() - 7);
      if (view === "day") current.setDate(current.getDate() - 1);
      setDate(current);
    } else if (action === "NEXT") {
      if (view === "month") current.setMonth(current.getMonth() + 1);
      if (view === "week") current.setDate(current.getDate() + 7);
      if (view === "day") current.setDate(current.getDate() + 1);
      setDate(current);
    }
  };

  // Custom toolbar
  function Toolbar() {
    return (
      <div className="flex flex-col gap-2 mb-4 px-2">
        {/* Month/Year Dropdown Row */}
        <div className="flex gap-2 items-center justify-center w-full">
          <select
            value={date.getMonth()}
            onChange={e => {
              const newDate = new Date(date);
              newDate.setMonth(Number(e.target.value));
              setDate(newDate);
            }}
            className="rounded-lg bg-[#223a5e] text-pink-200 px-2 py-1 font-semibold shadow focus:outline-none"
          >
            {months.map((m, idx) => (
              <option key={m} value={idx}>{m}</option>
            ))}
          </select>
          <select
            value={date.getFullYear()}
            onChange={e => {
              const newDate = new Date(date);
              newDate.setFullYear(Number(e.target.value));
              setDate(newDate);
            }}
            className="rounded-lg bg-[#223a5e] text-pink-200 px-2 py-1 font-semibold shadow focus:outline-none"
          >
            {years.map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
        </div>
        {/* Navigation/Views Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 w-full">
          <div className="flex gap-2 mb-2 sm:mb-0 items-center">
            <button
              className="rounded-full bg-[#192f4c] text-pink-400 hover:bg-[#223a5e] px-3 py-1 font-bold shadow"
              onClick={() => handleNavigate('PREV')}
            >
              ←
            </button>
            <button
              className="rounded-full bg-[#192f4c] text-pink-400 hover:bg-[#223a5e] px-3 py-1 font-bold shadow"
              onClick={() => handleNavigate('TODAY')}
            >
              Heute
            </button>
            <button
              className="rounded-full bg-[#192f4c] text-pink-400 hover:bg-[#223a5e] px-3 py-1 font-bold shadow"
              onClick={() => handleNavigate('NEXT')}
            >
              →
            </button>
          </div>
          <div className="flex gap-2">
            <button
              className={`rounded-lg px-3 py-1 font-semibold text-xs shadow ${view === 'month' ? 'bg-pink-600 text-white' : 'bg-[#223a5e] text-pink-200 hover:bg-pink-700'}`}
              onClick={() => setView('month')}
            >
              Monat
            </button>
            <button
              className={`rounded-lg px-3 py-1 font-semibold text-xs shadow ${view === 'week' ? 'bg-pink-600 text-white' : 'bg-[#223a5e] text-pink-200 hover:bg-pink-700'}`}
              onClick={() => setView('week')}
            >
              Woche
            </button>
            <button
              className={`rounded-lg px-3 py-1 font-semibold text-xs shadow ${view === 'day' ? 'bg-pink-600 text-white' : 'bg-[#223a5e] text-pink-200 hover:bg-pink-700'}`}
              onClick={() => setView('day')}
            >
              Tag
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Helper: status color for dot
  function getDotColor(status) {
    if (status === 'approved') return 'bg-green-500';
    if (status === 'pending') return 'bg-yellow-400';
    if (status === 'rejected') return 'bg-red-500';
    return 'bg-pink-500';
  }

  // Custom month cell renderer: show dots for each appointment (match by YYYY-MM-DD)
  function CustomMonthDateCell({ date, events }) {
    const cellDateKey = date.toISOString().split('T')[0];
    const todaysEvents = events.filter(ev => ev.dateKey === cellDateKey);
    return (
      <div className="flex flex-col items-center justify-center min-h-[48px]">
        <span className="text-xs text-blue-100 mb-1">{date.getDate()}</span>
        <div className="flex flex-wrap gap-0.5 justify-center">
          {todaysEvents.slice(0, 4).map(ev => (
            <span
              key={ev.id}
              className={`w-2 h-2 rounded-full ${getDotColor(ev.resource.approval_status)} border border-white`}
              title={ev.title}
            />
          ))}
          {todaysEvents.length > 4 && (
            <span className="text-xs text-pink-300 ml-1">+{todaysEvents.length - 4}</span>
          )}
        </div>
      </div>
    );
  }

  // Popup for day details (show time as string)
  const [popupInfo, setPopupInfo] = useState({ show: false, date: null, events: [] });
  function handleDateClick(slotInfo) {
    const slotDateKey = slotInfo.start.toISOString().split('T')[0];
    const todaysEvents = events.filter(ev => ev.dateKey === slotDateKey);
    if (todaysEvents.length > 0) {
      setPopupInfo({ show: true, date: slotInfo.start, events: todaysEvents });
    }
  }
  function closePopup() {
    setPopupInfo({ show: false, date: null, events: [] });
  }

  return (
    <div
      className="bg-[#0a1929] p-2 sm:p-4 rounded-2xl border border-[#223a5e] shadow-xl"
      style={{ minHeight: 400, overflow: 'hidden' }}
    >
      <Toolbar />
      <div className="w-full overflow-x-auto md:overflow-visible">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 500, minWidth: 320, background: "transparent" }}
          popup
          views={["month", "week", "day"]}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          components={{
            toolbar: () => null,
            month: {
              dateHeader: (props) => (
                <div onClick={() => handleDateClick({ start: props.date })} className="cursor-pointer">
                  <CustomMonthDateCell date={props.date} events={events} />
                </div>
              ),
            },
          }}
          eventPropGetter={() => ({
            style: {
              display: view === 'month' ? 'none' : undefined,
            },
          })}
          messages={{
            month: "Monat",
            week: "Woche",
            day: "Tag",
            today: "Heute",
            previous: "Zurück",
            next: "Weiter",
            showMore: (total) => `+${total} mehr`,
          }}
        />
        {/* Day popup */}
        {popupInfo.show && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <div className="bg-[#132f4c] rounded-2xl shadow-xl p-6 w-full max-w-xs mx-2">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-bold text-white">{popupInfo.date && popupInfo.date.toLocaleDateString()}</span>
                <button onClick={closePopup} className="text-pink-400 hover:text-pink-200 text-xl font-bold">×</button>
              </div>
              <div className="space-y-3">
                {popupInfo.events.map(ev => (
                  <div key={ev.id} className="flex items-center gap-2 bg-blue-900/80 rounded-lg px-3 py-2">
                    <span className={`w-3 h-3 rounded-full ${getDotColor(ev.resource.approval_status)} border border-white`} />
                    <span className="text-white text-sm font-semibold">{ev.title}</span>
                    <span className="text-xs text-blue-200 ml-auto">{ev.timeStr || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
