import React from 'react';
import { Sparkles, ArrowRight, Zap } from 'lucide-react';
import { EventRecord } from '../../types/index.js';

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendations: EventRecord[];
}

export const MilestoneModal: React.FC<MilestoneModalProps> = ({
  isOpen,
  onClose,
  recommendations
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-paper border-3 border-ink shadow-hard-lg max-w-lg w-full p-5 sm:p-6 animate-in zoom-in-95">
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-acid border border-ink font-display font-bold text-xs uppercase tracking-wider text-ink mb-3 shadow-hard-sm">
          <Zap className="w-4 h-4 text-pulse fill-pulse" />
          <span>Personalization Milestone</span>
        </div>

        <h3 className="font-display font-bold text-2xl text-ink leading-tight mb-2">
          Your feed just got sharper!
        </h3>
        <p className="text-xs sm:text-sm text-slate mb-4">
          Every swipe recalculates your affinity weights in Databricks Lakebase. Here are 3 new recommendations customized for your profile:
        </p>

        {/* 3 Recommended Events */}
        <div className="space-y-2.5 mb-5">
          {recommendations.slice(0, 3).map((rec) => (
            <div key={rec.event_id} className="p-3 bg-paper-card border-2 border-ink shadow-hard-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-display font-bold text-xs text-ink truncate pr-2">
                  {rec.title}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-paper border border-ink font-bold text-flare">
                  {rec.category.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-pulse font-semibold">
                ★ {rec.reason || 'High affinity match based on your recent swipes'}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-ink text-paper font-display font-bold text-xs uppercase tracking-wider border-2 border-ink shadow-hard hover:bg-pulse flex items-center justify-center space-x-2 transition-colors"
        >
          <span>Continue Swiping</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
