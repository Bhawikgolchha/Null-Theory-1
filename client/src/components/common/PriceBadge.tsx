import React from 'react';

interface PriceBadgeProps {
  isFree: boolean;
  feeInr: number;
  className?: string;
}

export const PriceBadge: React.FC<PriceBadgeProps> = ({ isFree, feeInr, className = '' }) => {
  if (isFree || feeInr === 0) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 font-display font-semibold text-xs tracking-wider uppercase border border-ink bg-acid text-ink shadow-hard-sm ${className}`}>
        FREE
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 font-display font-semibold text-xs tracking-wide border border-ink bg-paper text-ink shadow-hard-sm ${className}`}>
      ₹{feeInr.toLocaleString('en-IN')}
    </span>
  );
};
