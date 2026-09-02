import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Heart, X, Sparkles, MapPin, Trophy, Undo2, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import { EventRecord } from '../../types/index.js';
import { PriceBadge } from '../common/PriceBadge.js';
import { MilestoneModal } from './MilestoneModal.js';

interface SwipeDeckProps {
  events: EventRecord[];
  onSwipeBatch: (swipes: { event_id: string; direction: 'right' | 'left' | 'super'; dwell_ms: number; surface: string }[]) => void;
  onOpenDetail: (event: EventRecord) => void;
  fetchRecommendations: () => Promise<EventRecord[]>;
}

export const SwipeDeck: React.FC<SwipeDeckProps> = ({
  events,
  onSwipeBatch,
  onOpenDetail,
  fetchRecommendations
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeBuffer, setSwipeBuffer] = useState<{ event_id: string; direction: 'right' | 'left' | 'super'; dwell_ms: number; surface: string }[]>([]);
  const [totalSwipesCount, setTotalSwipesCount] = useState(0);
  const [showMilestone, setShowMilestone] = useState(false);
  const [milestoneRecs, setMilestoneRecs] = useState<EventRecord[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);

  const activeEvent = events[currentIndex];

  // Motion values for drag physics
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [10, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, -10], [1, 0]);

  // Flush buffer every 5 swipes or on unmount
  useEffect(() => {
    if (swipeBuffer.length >= 5) {
      onSwipeBatch([...swipeBuffer]);
      setSwipeBuffer([]);
    }
  }, [swipeBuffer]);

  const handleSwipe = async (direction: 'right' | 'left' | 'super') => {
    if (!activeEvent) return;

    const newSwipe = {
      event_id: activeEvent.event_id,
      direction,
      dwell_ms: 1200,
      surface: 'swipe_deck'
    };

    const newBuffer = [...swipeBuffer, newSwipe];
    setSwipeBuffer(newBuffer);

    const newCount = totalSwipesCount + 1;
    setTotalSwipesCount(newCount);
    setCurrentIndex(prev => prev + 1);
    setIsFlipped(false);
    x.set(0);
    y.set(0);

    // Every 10 swipes, trigger personalization milestone modal
    if (newCount % 10 === 0) {
      const recs = await fetchRecommendations();
      setMilestoneRecs(recs);
      setShowMilestone(true);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleSwipe('right');
      if (e.key === 'ArrowLeft') handleSwipe('left');
      if (e.key === 'ArrowUp') handleSwipe('super');
      if (e.key === ' ') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeEvent, swipeBuffer, totalSwipesCount]);

  if (!activeEvent || currentIndex >= events.length) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-paper-card border-3 border-ink shadow-hard-lg text-center">
        <Sparkles className="w-12 h-12 text-pulse mx-auto mb-3" />
        <h3 className="font-display font-bold text-2xl text-ink mb-2">You've swiped all events!</h3>
        <p className="text-xs sm:text-sm text-slate mb-5">
          Your taste profile is now sharp and tuned. Switch to Calendar to see your updated ranked view.
        </p>
        <button
          onClick={() => setCurrentIndex(0)}
          className="px-4 py-2 bg-ink text-paper font-display font-bold text-xs uppercase tracking-wider border-2 border-ink shadow-hard-sm"
        >
          Reset Deck
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-4 sm:py-6 flex flex-col items-center">
      {/* Progress and controls help */}
      <div className="w-full flex items-center justify-between text-xs text-slate font-medium mb-3">
        <span>Swiped: <strong className="text-ink">{totalSwipesCount}</strong> events</span>
        <div className="flex items-center space-x-2 text-[10px] hidden sm:flex">
          <span className="flex items-center space-x-1"><ArrowLeft className="w-3 h-3"/> <span>Nope</span></span>
          <span className="flex items-center space-x-1"><ArrowRight className="w-3 h-3"/> <span>Like</span></span>
          <span className="flex items-center space-x-1"><ArrowUp className="w-3 h-3"/> <span>Super</span></span>
        </div>
      </div>

      {/* Swipe Card Stack */}
      <div className="relative w-full h-[470px]">
        <AnimatePresence>
          <motion.div
            key={activeEvent.event_id}
            style={{ x, y, rotate }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x > 100) {
                handleSwipe('right');
              } else if (info.offset.x < -100) {
                handleSwipe('left');
              } else if (info.offset.y < -100) {
                handleSwipe('super');
              }
            }}
            className="absolute inset-0 bg-paper-card border-3 border-ink shadow-hard-lg flex flex-col justify-between overflow-hidden cursor-grab active:cursor-grabbing select-none"
          >
            {/* Stamp Overlays */}
            <motion.div
              style={{ opacity: likeOpacity }}
              className="absolute top-6 left-6 z-20 border-3 border-pulse bg-pulse/10 text-pulse font-display font-bold text-3xl px-3 py-1 uppercase rotate-[-15deg] shadow-hard-sm"
            >
              LIKE
            </motion.div>
            <motion.div
              style={{ opacity: nopeOpacity }}
              className="absolute top-6 right-6 z-20 border-3 border-flare bg-flare/10 text-flare font-display font-bold text-3xl px-3 py-1 uppercase rotate-[15deg] shadow-hard-sm"
            >
              NOPE
            </motion.div>

            {/* Card Content (Front or Flipped) */}
            {!isFlipped ? (
              <div className="p-5 flex-1 flex flex-col justify-between" onClick={() => setIsFlipped(true)}>
                <div>
                  {/* Top Bar: Category & Price Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 text-xs font-display font-bold uppercase tracking-wider bg-ink text-paper border border-ink">
                      {activeEvent.category.replace('_', ' ')}
                    </span>
                    <PriceBadge isFree={activeEvent.is_free} feeInr={activeEvent.fee_inr} />
                  </div>

                  {/* Title & Organizer */}
                  <h3 className="font-display font-bold text-2xl text-ink leading-tight mb-2">
                    {activeEvent.title}
                  </h3>
                  <p className="text-xs font-medium text-pulse mb-3">
                    {activeEvent.organizer} · {activeEvent.college.split(' ')[0]}
                  </p>

                  {/* Short Pitch */}
                  <p className="text-sm text-ink leading-snug mb-4 font-sans bg-paper p-3 border border-ink/40">
                    "{activeEvent.short_pitch}"
                  </p>
                </div>

                {/* Metadata details */}
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate font-medium mb-3">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-slate" />
                      <span>{activeEvent.area}</span>
                    </span>
                    {activeEvent.prize_pool_inr > 0 && (
                      <span className="flex items-center space-x-1 text-flare font-bold">
                        <Trophy className="w-3.5 h-3.5" />
                        <span>₹{(activeEvent.prize_pool_inr / 1000).toFixed(0)}k</span>
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {activeEvent.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-0.5 text-[10px] font-mono bg-paper border border-ink text-slate">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <p className="text-[10px] text-center text-slate mt-4 font-semibold uppercase tracking-wider">
                    Tap to flip details · Drag or use ← / → keys
                  </p>
                </div>
              </div>
            ) : (
              /* Flipped Card View */
              <div className="p-5 flex-1 flex flex-col justify-between" onClick={() => setIsFlipped(false)}>
                <div>
                  <h4 className="font-display font-bold text-sm uppercase tracking-wider text-ink mb-2">Full Description</h4>
                  <p className="text-xs text-ink leading-relaxed mb-4">
                    {activeEvent.description}
                  </p>
                  <div className="text-xs space-y-1 bg-paper p-3 border border-ink">
                    <div><strong>Eligibility:</strong> {activeEvent.eligibility}</div>
                    <div><strong>Team:</strong> {activeEvent.team_size_min}-{activeEvent.team_size_max} Members</div>
                    <div><strong>Mode:</strong> {activeEvent.mode}</div>
                  </div>
                </div>
                <p className="text-[10px] text-center text-slate font-semibold uppercase">
                  Tap to flip back
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Buttons: Nope, Super, Like */}
      <div className="flex items-center justify-center space-x-4 mt-5">
        <button
          onClick={() => handleSwipe('left')}
          className="w-13 h-13 rounded-full bg-paper border-3 border-ink shadow-hard flex items-center justify-center text-flare hover:scale-105 active:translate-x-0.5 active:translate-y-0.5 transition-transform"
          title="Nope (← key)"
        >
          <X className="w-6 h-6 stroke-[3]" />
        </button>

        <button
          onClick={() => handleSwipe('super')}
          className="w-11 h-11 rounded-full bg-paper border-3 border-ink shadow-hard flex items-center justify-center text-pulse hover:scale-105 active:translate-x-0.5 active:translate-y-0.5 transition-transform"
          title="Super Like (↑ key)"
        >
          <Sparkles className="w-5 h-5 fill-pulse" />
        </button>

        <button
          onClick={() => handleSwipe('right')}
          className="w-13 h-13 rounded-full bg-acid border-3 border-ink shadow-hard flex items-center justify-center text-ink hover:scale-105 active:translate-x-0.5 active:translate-y-0.5 transition-transform"
          title="Like (→ key)"
        >
          <Heart className="w-6 h-6 stroke-[3] fill-ink" />
        </button>
      </div>

      {/* Milestone Modal */}
      <MilestoneModal
        isOpen={showMilestone}
        onClose={() => setShowMilestone(false)}
        recommendations={milestoneRecs}
      />
    </div>
  );
};
