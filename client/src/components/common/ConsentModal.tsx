import React from 'react';
import { ShieldCheck, ExternalLink, X } from 'lucide-react';
import { EventRecord } from '../../types/index.js';

interface ConsentModalProps {
  isOpen: boolean;
  event: EventRecord | null;
  onClose: () => void;
  onConfirm: (shareConsent: boolean) => void;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({ isOpen, event, onClose, onConfirm }) => {
  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-paper border-3 border-ink shadow-hard-lg max-w-md w-full p-5 relative animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 hover:bg-slate/20 border border-transparent hover:border-ink transition-colors"
        >
          <X className="w-5 h-5 text-ink" />
        </button>

        <div className="flex items-center space-x-2 text-pulse mb-3">
          <ShieldCheck className="w-6 h-6 text-pulse" />
          <span className="font-display font-bold text-sm tracking-wider uppercase text-ink">
            Registration Handoff
          </span>
        </div>

        <h3 className="font-display font-bold text-xl text-ink leading-tight mb-3">
          Share your details with {event.organizer}?
        </h3>

        <div className="bg-paper-card border-2 border-ink p-3 text-xs space-y-2 mb-4">
          <p className="text-ink font-medium">
            <span className="font-bold text-pulse">They'll see:</span> your name, college email, department, and year of study.
          </p>
          <p className="text-slate">
            <span className="font-bold text-ink">They will NOT see:</span> your swipe history, other events you've saved, or anything you've asked the AI assistant.
          </p>
        </div>

        <p className="text-[11px] text-slate mb-5">
          Declining still lets you register on the official portal — the organizer will simply record you as an anonymous attendee.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => onConfirm(true)}
            className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-pulse text-paper font-display font-bold text-xs uppercase tracking-wider border-2 border-ink shadow-hard-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
          >
            <span>Share & Continue</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onConfirm(false)}
            className="py-2.5 px-3 bg-paper-card text-ink font-display font-semibold text-xs border-2 border-ink shadow-hard-sm hover:bg-slate/10 transition-all"
          >
            Continue anonymously
          </button>
        </div>
      </div>
    </div>
  );
};
