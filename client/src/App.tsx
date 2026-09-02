import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header.js';
import { FilterRail } from './components/calendar/FilterRail.js';
import { MonthGrid } from './components/calendar/MonthGrid.js';
import { AgendaList } from './components/calendar/AgendaList.js';
import { EventDetailModal } from './components/calendar/EventDetailModal.js';
import { SwipeDeck } from './components/swipe/SwipeDeck.js';
import { AssistantDrawer } from './components/assistant/AssistantDrawer.js';
import { ConsentModal } from './components/common/ConsentModal.js';
import { ReturnPrompt } from './components/common/ReturnPrompt.js';
import { OrganizerDashboard } from './components/organizer/OrganizerDashboard.js';
import { EventRecord, UserSession, ChatMessage, RegistrationRecord } from './types/index.js';
import { Sparkles, Calendar as CalIcon, Compass, Users } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'discover' | 'organizer' | 'profile'>('calendar');
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [feedEvents, setFeedEvents] = useState<EventRecord[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [userAffinities, setUserAffinities] = useState<Record<string, number>>({});
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set());

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [matchesTasteOnly, setMatchesTasteOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Assistant state
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  
  // Registration flow state
  const [pendingRegisterEvent, setPendingRegisterEvent] = useState<EventRecord | null>(null);
  const [pendingHandoffToken, setPendingHandoffToken] = useState<string | null>(null);
  const [showReturnPrompt, setShowReturnPrompt] = useState<boolean>(false);
  const [activeReturnEvent, setActiveReturnEvent] = useState<EventRecord | null>(null);

  // 1. Initial Data Fetch
  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedArea !== 'all') params.append('area', selectedArea);
      if (priceFilter === 'free') params.append('free', 'true');
      if (priceFilter === 'paid') params.append('free', 'false');
      if (searchQuery) params.append('q', searchQuery);

      const res = await fetch(`/api/events?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setUserAffinities(data.affinities || {});
        setRegistrations(data.registrations || []);
        
        const saved = new Set<string>();
        data.registrations?.forEach((r: any) => {
          if (r.state === 'saved') saved.add(r.event_id);
        });
        setSavedEventIds(saved);
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    }
  };

  const fetchFeed = async () => {
    try {
      const res = await fetch('/api/feed');
      if (res.ok) {
        const data = await res.json();
        setFeedEvents(data.feed || []);
      }
    } catch (err) {
      console.error('Failed to fetch feed:', err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory, selectedArea, priceFilter, searchQuery]);

  useEffect(() => {
    fetchUserData();
    fetchFeed();
  }, []);

  // 2. Return detection via visibilitychange
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && pendingHandoffToken && pendingRegisterEvent) {
        setActiveReturnEvent(pendingRegisterEvent);
        setShowReturnPrompt(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pendingHandoffToken, pendingRegisterEvent]);

  // 3. Handlers
  const handleSelectPersona = async (personaKey: string) => {
    try {
      await fetch('/api/persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona: personaKey })
      });
      await fetchUserData();
      await fetchFeed();
      await fetchEvents();
    } catch (err) {
      console.error('Error selecting persona:', err);
    }
  };

  const handleSwipeBatch = async (swipes: any[]) => {
    try {
      await fetch('/api/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ swipes })
      });
      fetchUserData();
    } catch (err) {
      console.error('Error posting swipes:', err);
    }
  };

  const handleSaveToCalendar = async (event: EventRecord) => {
    try {
      await fetch(`/api/events/${event.event_id}/save`, { method: 'POST' });
      setSavedEventIds(prev => new Set(prev).add(event.event_id));
      fetchUserData();
    } catch (err) {
      console.error('Error saving to calendar:', err);
    }
  };

  const handleStartRegister = (event: EventRecord) => {
    setSelectedEvent(null);
    setPendingRegisterEvent(event);
  };

  const handleConfirmRegisterHandoff = async (shareConsent: boolean) => {
    if (!pendingRegisterEvent) return;
    try {
      const res = await fetch(`/api/events/${pendingRegisterEvent.event_id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_consent: shareConsent })
      });

      if (res.ok) {
        const data = await res.json();
        setPendingHandoffToken(data.handoff_token);
        // Open outbound official registration portal
        window.open(data.registration_url, '_blank');
      }
    } catch (err) {
      console.error('Error during register handoff:', err);
    }
  };

  const handleReturnConfirm = async (completed: boolean) => {
    if (!activeReturnEvent || !pendingHandoffToken) {
      setShowReturnPrompt(false);
      return;
    }

    try {
      await fetch(`/api/events/${activeReturnEvent.event_id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed,
          handoff_token: pendingHandoffToken
        })
      });
      fetchUserData();
    } catch (err) {
      console.error('Error confirming return:', err);
    } finally {
      setShowReturnPrompt(false);
      setPendingHandoffToken(null);
      setPendingRegisterEvent(null);
    }
  };

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      if (res.ok) {
        const reply = await res.json();
        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: 'assistant',
          text: reply.text,
          sql: reply.sql,
          rows: reply.rows,
          citations: reply.citations,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err) {
      console.error('Error in chat:', err);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col font-sans">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onSelectPersona={handleSelectPersona}
        unreadNotifsCount={3}
        onOpenNotifications={() => setIsAssistantOpen(true)}
      />

      {/* Main Surface */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* Calendar View */}
        {activeTab === 'calendar' && (
          <div>
            <FilterRail
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedArea={selectedArea}
              setSelectedArea={setSelectedArea}
              priceFilter={priceFilter}
              setPriceFilter={setPriceFilter}
              matchesTasteOnly={matchesTasteOnly}
              setMatchesTasteOnly={setMatchesTasteOnly}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />

            {/* Desktop Month Grid */}
            <div className="hidden md:block">
              <MonthGrid
                events={events}
                onSelectEvent={setSelectedEvent}
                matchesTasteOnly={matchesTasteOnly}
                userAffinities={userAffinities}
              />
            </div>

            {/* Mobile Vertical Agenda View (375px responsive) */}
            <div className="block md:hidden">
              <AgendaList
                events={events}
                onSelectEvent={setSelectedEvent}
                matchesTasteOnly={matchesTasteOnly}
                userAffinities={userAffinities}
              />
            </div>
          </div>
        )}

        {/* Discover Swipe Deck View */}
        {activeTab === 'discover' && (
          <SwipeDeck
            events={feedEvents.length > 0 ? feedEvents : events}
            onSwipeBatch={handleSwipeBatch}
            onOpenDetail={setSelectedEvent}
            fetchRecommendations={async () => {
              const res = await fetch('/api/recommendations');
              return res.ok ? await res.json() : [];
            }}
          />
        )}

        {/* Organizer Dashboard View */}
        {activeTab === 'organizer' && (
          <OrganizerDashboard
            registrations={registrations}
            onUploadCsvVerify={fetchUserData}
          />
        )}
      </main>

      {/* Event Detail Sheet Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        onSaveToCalendar={handleSaveToCalendar}
        onStartRegister={handleStartRegister}
        isSaved={selectedEvent ? savedEventIds.has(selectedEvent.event_id) : false}
      />

      {/* Consent Sheet Modal */}
      <ConsentModal
        isOpen={Boolean(pendingRegisterEvent)}
        event={pendingRegisterEvent}
        onClose={() => setPendingRegisterEvent(null)}
        onConfirm={handleConfirmRegisterHandoff}
      />

      {/* Return Detector Prompt */}
      <ReturnPrompt
        isOpen={showReturnPrompt}
        event={activeReturnEvent}
        onConfirm={handleReturnConfirm}
      />

      {/* Assistant Drawer */}
      <AssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(!isAssistantOpen)}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        isLoading={isChatLoading}
        onSaveToCalendar={handleSaveToCalendar}
        onStartRegister={handleStartRegister}
      />
    </div>
  );
};
export default App;
