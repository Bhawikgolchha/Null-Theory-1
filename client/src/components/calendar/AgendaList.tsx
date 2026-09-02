import React from 'react';
import { EventRecord } from '../../types/index.js';
import { PriceBadge } from '../common/PriceBadge.js';
import { MapPin, Trophy } from 'lucide-react';

interface AgendaListProps {
  events: EventRecord[];
  onSelectEvent: (event: EventRecord) => void;
  matchesTasteOnly: boolean;
  userAffinities: Record<string, number>;
}

export const AgendaList: React.FC<AgendaListProps> = ({
  events,
  onSelectEvent,
  matchesTasteOnly,
  userAffinities
}) => {
  // Group events by date string
  const grouped: Record<string, EventRecord[]> = {};
  for (const ev of events) {
    const d = new Date(ev.start_ts).toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(ev);
  }

  const isTasteMatch = (event: EventRecord) => {
    return event.tags.some(t => (userAffinities[t] || 0) > 0.5);
  };

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([dateLabel, dayEvents]) => (
        <div key={dateLabel} className="bg-paper-card border-2 border-ink shadow-hard-sm">
          {/* Sticky Date Header */}
          <div className="sticky top-[60px] z-10 bg-ink text-paper px-3 py-1.5 flex items-center justify-between">
            <span className="font-display font-bold text-xs uppercase tracking-wider">
              {dateLabel}
            </span>
            <span className="text-[10px] text-acid font-mono font-bold">
              {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
            </span>
          </div>

          {/* Event Items */}
          <div className="divide-y divide-ink/20">
            {dayEvents.map(ev => {
              const match = isTasteMatch(ev);
              const isDimmed = matchesTasteOnly && !match;

              return (
                <div
                  key={ev.event_id}
                  onClick={() => onSelectEvent(ev)}
                  className={`p-3 cursor-pointer hover:bg-paper transition-all ${
                    isDimmed ? 'opacity-25' : 'opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="font-display font-bold text-sm text-ink leading-snug">
                      {ev.title}
                    </h4>
                    <PriceBadge isFree={ev.is_free} feeInr={ev.fee_inr} />
                  </div>

                  <p className="text-xs text-slate line-clamp-1 mb-2">
                    {ev.short_pitch}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate font-medium">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-pulse" />
                      <span>{ev.area}</span>
                    </span>
                    <span>·</span>
                    <span>{ev.college.split(' ')[0]}</span>
                    {ev.prize_pool_inr > 0 && (
                      <>
                        <span>·</span>
                        <span className="flex items-center space-x-0.5 text-flare font-bold">
                          <Trophy className="w-3 h-3" />
                          <span>₹{(ev.prize_pool_inr / 1000).toFixed(0)}k</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
