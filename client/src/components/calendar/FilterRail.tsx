import React from 'react';
import { Sparkles, MapPin, Search } from 'lucide-react';

interface FilterRailProps {
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedArea: string;
  setSelectedArea: (area: string) => void;
  priceFilter: 'all' | 'free' | 'paid';
  setPriceFilter: (p: 'all' | 'free' | 'paid') => void;
  matchesTasteOnly: boolean;
  setMatchesTasteOnly: (m: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'hackathon', label: 'Hackathons', color: 'bg-flare text-paper' },
  { id: 'tech_talk', label: 'Tech Talks', color: 'bg-pulse text-paper' },
  { id: 'workshop', label: 'Workshops', color: 'bg-ink text-paper' },
  { id: 'cultural', label: 'Cultural', color: 'bg-acid text-ink' },
  { id: 'career_fair', label: 'Career Fairs', color: 'bg-slate text-paper' },
  { id: 'sports', label: 'Sports & Gaming', color: 'bg-paper text-ink' }
];

const BANGALORE_AREAS = [
  'All Areas',
  'Koramangala',
  'Indiranagar',
  'Whitefield',
  'Electronic City',
  'Jayanagar',
  'HSR Layout',
  'Malleshwaram',
  'Yelahanka'
];

export const FilterRail: React.FC<FilterRailProps> = ({
  selectedCategory,
  setSelectedCategory,
  selectedArea,
  setSelectedArea,
  priceFilter,
  setPriceFilter,
  matchesTasteOnly,
  setMatchesTasteOnly,
  searchQuery,
  setSearchQuery
}) => {
  return (
    <div className="bg-paper-card border-2 border-ink shadow-hard p-3 sm:p-4 mb-5 space-y-3 sm:space-y-4">
      {/* Search & Taste Match Row */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate" />
          <input
            type="text"
            placeholder="Search hackathons, AI, RVCE, Whitefield..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-paper border-2 border-ink text-xs sm:text-sm font-sans placeholder:text-slate focus:outline-hidden focus:ring-2 focus:ring-pulse"
          />
        </div>

        {/* Taste Profile Dimmer Toggle */}
        <button
          onClick={() => setMatchesTasteOnly(!matchesTasteOnly)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 border-2 border-ink text-xs font-display font-bold uppercase tracking-wider transition-all shadow-hard-sm ${
            matchesTasteOnly
              ? 'bg-acid text-ink ring-2 ring-ink'
              : 'bg-paper text-ink hover:bg-slate/10'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-pulse" />
          <span>Matches My Taste</span>
          <span className="text-[10px] lowercase text-slate font-normal hidden md:inline">
            ({matchesTasteOnly ? 'active' : 'off'})
          </span>
        </button>
      </div>

      {/* Categories & Price Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2.5 py-1 text-xs font-display font-semibold border-2 border-ink transition-all ${
              selectedCategory === cat.id
                ? 'bg-ink text-paper shadow-hard-sm'
                : 'bg-paper text-ink hover:bg-paper-card'
            }`}
          >
            {cat.label}
          </button>
        ))}

        {/* Price selector */}
        <div className="flex border-2 border-ink ml-auto">
          <button
            onClick={() => setPriceFilter('all')}
            className={`px-2 py-0.5 text-xs font-display font-bold ${
              priceFilter === 'all' ? 'bg-ink text-paper' : 'bg-paper text-ink'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => setPriceFilter('free')}
            className={`px-2 py-0.5 text-xs font-display font-bold border-l border-ink ${
              priceFilter === 'free' ? 'bg-acid text-ink' : 'bg-paper text-ink'
            }`}
          >
            FREE
          </button>
          <button
            onClick={() => setPriceFilter('paid')}
            className={`px-2 py-0.5 text-xs font-display font-bold border-l border-ink ${
              priceFilter === 'paid' ? 'bg-ink text-paper' : 'bg-paper text-ink'
            }`}
          >
            PAID
          </button>
        </div>

        {/* Area dropdown */}
        <div className="flex items-center space-x-1 pl-1">
          <MapPin className="w-3.5 h-3.5 text-slate" />
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="text-xs bg-paper border border-ink py-1 px-1 font-sans font-medium focus:outline-hidden"
          >
            {BANGALORE_AREAS.map(area => (
              <option key={area} value={area === 'All Areas' ? 'all' : area}>
                {area}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
