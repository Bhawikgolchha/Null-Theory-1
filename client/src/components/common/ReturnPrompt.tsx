import React from 'react';
import { CheckCircle2, HelpCircle } from 'lucide-react';
import { EventRecord } from '../../types/index.js';

interface ReturnPromptProps {
  isOpen: boolean;
  event: EventRecord | null;
  onConfirm: (completed: boolean) => void;
}

export const ReturnPrompt: React.FC<ReturnPromptProps> = ({ isOpen, event, onConfirm }) => {
  if (!isOpen || !event) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 max-w-sm w-full bg-paper-card border-3 border-ink shadow-hard-lg p-4 animate-in slide-in-from-bottom-5">
      <div className="flex items-start space-x-3 mb-3">
        <div className="p-2 bg-acid border border-ink text-ink">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-display font-bold text-sm text-ink leading-tight">
            Did you finish registering?
          </h4>
          <p className="text-xs text-slate mt-0.5 line-clamp-1">
            {event.title}
          </p>
        </div>
      </div>

      <p className="text-[11px] text-slate mb-3">
        Confirming helps your college activities office and clubs track headcount accurately.
      </p>

      <div className="flex space-x-2">
        <button
          onClick={() => onConfirm(true)}
          className="flex-1 py-1.5 px-3 bg-acid text-ink font-display font-bold text-xs uppercase tracking-wider border-2 border-ink shadow-hard-sm hover:translate-x-0.5 hover:translate-y-0.5 flex items-center justify-center space-x-1"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Yes, I did</span>
        </button>
        <button
          onClick={() => onConfirm(false)}
          className="py-1.5 px-3 bg-paper text-ink font-display font-semibold text-xs border-2 border-ink shadow-hard-sm hover:bg-slate/10"
        >
          Not yet
        </button>
      </div>
    </div>
  );
};
