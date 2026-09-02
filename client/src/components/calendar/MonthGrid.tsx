import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EventRecord } from '../../types/index.js';

interface MonthGridProps {
  events: EventRecord[];
  onSelectEvent: (event: EventRecord) => void;
  matchesTasteOnly: boolean;
  userAffinities: Record<string, number>;
}

export const MonthGrid: React.FC<MonthGridProps> = ({
  events,
  onSelectEvent,
  matchesTasteOnly,
  userAffinities
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to get category spot color
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'hackathon':
        return 'bg-flare text-paper border-ink';
      case 'tech_talk':
        return 'bg-pulse text-paper border-ink';
      case 'workshop':
        return 'bg-ink text-paper border-ink';
      case 'cultural':
        return 'bg-acid text-ink border-ink';
      default:
        return 'bg-slate/80 text-paper border-ink';
    }
  };

  // Check if event matches user taste
  const isTasteMatch = (event: EventRecord) => {
    return event.tags.some(t => (userAffinities[t] || 0) > 0.5);
  };

  // Month navigation
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Compute days in month
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  // Map events to day
  const eventsByDay: Record<number, EventRecord[]> = {};
  for (const event of events) {
    const d = new Date(event.start_ts);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const dayNum = d.getDate();
      if (!eventsByDay[dayNum]) eventsByDay[dayNum] = [];
      eventsByDay[dayNum].push(event);
    }
  }

  const weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  return (
    <div className="bg-paper-card border-3 border-ink shadow-hard-lg p-3 sm:p-5">
      {/* Calendar Header with Navigation */}
      <div className="flex items-center justify-between pb-4 border-b-2 border-ink mb-4">
        <div className="flex items-center space-x-3">
          <h2 className="font-display font-bold text-xl sm:text-2xl tracking-tight text-ink uppercase">
            {monthNames[month]} {year}
          </h2>
          <button
            onClick={goToToday}
            className="px-2 py-0.5 text-xs font-display font-semibold border border-ink bg-paper hover:bg-acid text-ink uppercase"
          >
            Today
          </button>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={prevMonth}
            className="p-1.5 bg-paper border-2 border-ink shadow-hard-sm hover:bg-slate/10"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4 text-ink" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 bg-paper border-2 border-ink shadow-hard-sm hover:bg-slate/10"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4 text-ink" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
        {weekdays.map(day => (
          <div key={day} className="font-display font-bold text-[11px] sm:text-xs text-slate tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Day Cells Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {calendarDays.map((day, idx) => {
          if (day === null) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-[85px] sm:min-h-[105px] bg-paper/40 border border-ink/20 opacity-50"
              />
            );
          }

          const dayEvents = eventsByDay[day] || [];
          const isToday =
            new Date().getDate() === day &&
            new Date().getMonth() === month &&
            new Date().getFullYear() === year;

          return (
            <div
              key={`day-${day}`}
              className={`min-h-[85px] sm:min-h-[105px] p-1.5 sm:p-2 bg-paper border-2 border-ink transition-all flex flex-col justify-between ${
                isToday ? 'ring-2 ring-pulse ring-offset-1 bg-paper-card' : ''
              }`}
            >
              {/* Day numeral */}
              <div className="flex items-center justify-between mb-1">
                <span className={`font-display font-bold text-xs sm:text-sm ${isToday ? 'px-1.5 py-0.2 bg-pulse text-paper font-bold' : 'text-ink'}`}>
                  {day}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] text-slate font-mono font-medium">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event bars */}
              <div className="space-y-1 overflow-hidden">
                {dayEvents.slice(0, 2).map(ev => {
                  const match = isTasteMatch(ev);
                  const isDimmed = matchesTasteOnly && !match;

                  return (
                    <button
                      key={ev.event_id}
                      onClick={() => onSelectEvent(ev)}
                      className={`w-full text-left px-1.5 py-0.5 text-[10px] sm:text-[11px] font-sans font-semibold border truncate transition-opacity shadow-xs block ${getCategoryColor(
                        ev.category
                      )} ${isDimmed ? 'opacity-25' : 'opacity-100 hover:scale-[1.02]'}`}
                    >
                      {ev.title}
                    </button>
                  );
                })}

                {/* +N More Overflow */}
                {dayEvents.length > 2 && (
                  <button
                    onClick={() => onSelectEvent(dayEvents[2])}
                    className="w-full text-left text-[9px] font-display font-bold text-pulse uppercase hover:underline"
                  >
                    +{dayEvents.length - 2} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
