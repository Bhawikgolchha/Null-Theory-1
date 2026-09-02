import React from 'react';
import { X, Calendar, MapPin, Trophy, Users, ExternalLink, BookmarkCheck, FileText } from 'lucide-react';
import { EventRecord } from '../../types/index.js';
import { PriceBadge } from '../common/PriceBadge.js';

interface EventDetailModalProps {
  event: EventRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveToCalendar: (event: EventRecord) => void;
  onStartRegister: (event: EventRecord) => void;
  isSaved?: boolean;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  isOpen,
  onClose,
  onSaveToCalendar,
  onStartRegister,
  isSaved
}) => {
  if (!isOpen || !event) return null;

  const startDate = new Date(event.start_ts);
  const formattedDate = startDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-paper border-3 border-ink shadow-hard-lg max-w-xl w-full max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 p-5 sm:p-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 bg-paper-card border-2 border-ink shadow-hard-sm hover:bg-acid transition-colors"
        >
          <X className="w-5 h-5 text-ink" />
        </button>

        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <PriceBadge isFree={event.is_free} feeInr={event.fee_inr} />
          <span className="px-2 py-0.5 text-xs font-display font-semibold uppercase tracking-wider bg-ink text-paper border border-ink">
            {event.category.replace('_', ' ')}
          </span>
          <span className="px-2 py-0.5 text-xs font-sans font-medium uppercase tracking-wider bg-paper-card text-slate border border-ink">
            {event.mode}
          </span>
        </div>

        {/* Event Title */}
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-ink leading-tight mb-2">
          {event.title}
        </h2>
        <p className="text-sm font-medium text-pulse mb-4">
          Organized by {event.organizer} · {event.college}
        </p>

        {/* Event Key Metrics Box */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-paper-card border-2 border-ink p-3 mb-4 text-xs">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate" />
            <div>
              <div className="text-[10px] text-slate uppercase font-bold">Date</div>
              <div className="font-bold text-ink">{formattedDate}</div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-slate" />
            <div>
              <div className="text-[10px] text-slate uppercase font-bold">Location</div>
              <div className="font-bold text-ink truncate">{event.area}</div>
            </div>
          </div>

          {event.prize_pool_inr > 0 ? (
            <div className="flex items-center space-x-2 col-span-2 sm:col-span-1">
              <Trophy className="w-4 h-4 text-flare" />
              <div>
                <div className="text-[10px] text-slate uppercase font-bold">Prize Pool</div>
                <div className="font-bold text-flare">₹{event.prize_pool_inr.toLocaleString('en-IN')}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 col-span-2 sm:col-span-1">
              <Users className="w-4 h-4 text-pulse" />
              <div>
                <div className="text-[10px] text-slate uppercase font-bold">Team Size</div>
                <div className="font-bold text-ink">{event.team_size_min}-{event.team_size_max} Members</div>
              </div>
            </div>
          )}
        </div>

        {/* On-Duty (OD) Leave Compliance Notice for Multi-Day Events */}
        {event.duration_days > 1 && (
          <div className="bg-acid/30 border-2 border-ink p-3 mb-4 flex items-start space-x-2.5">
            <FileText className="w-4 h-4 text-ink shrink-0 mt-0.5" />
            <div className="text-xs text-ink">
              <span className="font-display font-bold uppercase tracking-wider block">
                On-Duty (OD) Leave Applicable ({event.duration_days} Days)
              </span>
              Eligible under university Clause 4.1 for collegiate hackathons. Apply 48h prior via your HoD.
            </div>
          </div>
        )}

        {/* Description & Pitch */}
        <div className="space-y-2 mb-6">
          <h4 className="font-display font-bold text-sm uppercase tracking-wider text-ink">About this Event</h4>
          <p className="text-xs sm:text-sm text-ink leading-relaxed">
            {event.description}
          </p>
          <div className="flex flex-wrap gap-1 pt-2">
            {event.tags.map(t => (
              <span key={t} className="px-2 py-0.5 text-[11px] font-mono bg-paper border border-ink text-slate">
                #{t}
              </span>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t-2 border-ink">
          <button
            onClick={() => onStartRegister(event)}
            className="flex-1 py-3 px-4 bg-pulse text-paper font-display font-bold text-sm uppercase tracking-wider border-2 border-ink shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 flex items-center justify-center space-x-2"
          >
            <span>Register on official site</span>
            <ExternalLink className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSaveToCalendar(event)}
            className={`py-3 px-4 font-display font-semibold text-xs sm:text-sm border-2 border-ink shadow-hard flex items-center justify-center space-x-1.5 transition-colors ${
              isSaved ? 'bg-acid text-ink' : 'bg-paper text-ink hover:bg-paper-card'
            }`}
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>{isSaved ? 'Saved to Calendar' : 'Save to my Calendar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
