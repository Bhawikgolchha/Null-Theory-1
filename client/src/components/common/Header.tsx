import React, { useState } from 'react';
import { Calendar, Compass, Users, Bell, UserCircle2, ChevronDown } from 'lucide-react';
import { UserSession } from '../../types/index.js';

interface HeaderProps {
  activeTab: 'calendar' | 'discover' | 'organizer' | 'profile';
  setActiveTab: (tab: 'calendar' | 'discover' | 'organizer' | 'profile') => void;
  currentUser: UserSession | null;
  onSelectPersona: (personaKey: string) => void;
  unreadNotifsCount: number;
  onOpenNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onSelectPersona,
  unreadNotifsCount,
  onOpenNotifications,
}) => {
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  return (
    <header className="border-b-2 border-ink bg-paper sticky top-0 z-30 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Wordmark */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('calendar')}>
          <div className="w-9 h-9 bg-pulse border-2 border-ink shadow-hard-sm flex items-center justify-center font-display font-bold text-acid text-lg">
            CG
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-display font-bold text-xl tracking-tight text-ink">CampusGenie</span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 bg-acid border border-ink text-[10px] font-bold uppercase tracking-widest text-ink">
                Bangalore
              </span>
            </div>
            <p className="text-[11px] text-slate font-medium hidden md:block">
              Databricks-hosted collegiate event lakehouse
            </p>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2 bg-paper-card p-1 border-2 border-ink shadow-hard-sm">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs sm:text-sm font-display font-medium transition-all ${
              activeTab === 'calendar'
                ? 'bg-ink text-paper font-semibold shadow-hard-sm'
                : 'text-ink hover:bg-paper'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Calendar</span>
          </button>

          <button
            onClick={() => setActiveTab('discover')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs sm:text-sm font-display font-medium transition-all ${
              activeTab === 'discover'
                ? 'bg-pulse text-paper font-semibold shadow-hard-sm'
                : 'text-ink hover:bg-paper'
            }`}
          >
            <Compass className="w-4 h-4 text-acid" />
            <span>Discover</span>
          </button>

          <button
            onClick={() => setActiveTab('organizer')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs sm:text-sm font-display font-medium transition-all ${
              activeTab === 'organizer'
                ? 'bg-flare text-paper font-semibold shadow-hard-sm'
                : 'text-ink hover:bg-paper'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Organizer</span>
          </button>
        </nav>

        {/* Right Actions: Notifications & Persona Switcher */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Notifications Button */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 bg-paper-card border-2 border-ink shadow-hard-sm hover:bg-acid transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-ink" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-flare border border-ink text-paper text-[10px] font-display font-bold flex items-center justify-center rounded-full">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Persona Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPersonaMenu(!showPersonaMenu)}
              className="flex items-center space-x-1.5 bg-paper-card border-2 border-ink shadow-hard-sm px-2.5 py-1.5 text-xs font-display font-semibold hover:bg-paper transition-colors"
            >
              <UserCircle2 className="w-4 h-4 text-pulse" />
              <span className="hidden sm:inline truncate max-w-[110px]">
                {currentUser ? currentUser.name.split(' ')[0] : 'Persona'}
              </span>
              <span className="px-1 py-0.2 bg-acid border border-ink text-[9px] uppercase font-bold text-ink">
                {currentUser?.role || 'demo'}
              </span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showPersonaMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-paper-card border-2 border-ink shadow-hard-lg z-50 p-2 text-xs">
                <div className="px-2 py-1 font-display font-bold text-slate border-b border-ink/20 uppercase tracking-wider text-[10px]">
                  Switch Demo Persona
                </div>
                <button
                  onClick={() => {
                    onSelectPersona('student-kg');
                    setShowPersonaMenu(false);
                  }}
                  className="w-full text-left px-2 py-2 mt-1 hover:bg-acid border border-transparent hover:border-ink transition-colors"
                >
                  <div className="font-bold text-ink">Karan Ganguly (KG)</div>
                  <div className="text-[11px] text-slate">Student · CSE 3rd Year · RVCE</div>
                </button>
                <button
                  onClick={() => {
                    onSelectPersona('organizer-robotics');
                    setShowPersonaMenu(false);
                  }}
                  className="w-full text-left px-2 py-2 hover:bg-acid border border-transparent hover:border-ink transition-colors"
                >
                  <div className="font-bold text-ink">Pooja Iyer</div>
                  <div className="text-[11px] text-slate">Organizer · Robotics Club · PES</div>
                </button>
                <button
                  onClick={() => {
                    onSelectPersona('judge-databricks');
                    setShowPersonaMenu(false);
                  }}
                  className="w-full text-left px-2 py-2 hover:bg-acid border border-transparent hover:border-ink transition-colors"
                >
                  <div className="font-bold text-ink">Databricks Hackathon Judge</div>
                  <div className="text-[11px] text-slate">Evaluator Mode</div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
