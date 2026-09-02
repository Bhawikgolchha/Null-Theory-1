import React, { useState } from 'react';
import { MessageSquare, X, Send, Terminal, BookOpen, Sparkles, ExternalLink, BookmarkPlus } from 'lucide-react';
import { ChatMessage, EventRecord } from '../../types/index.js';
import { PriceBadge } from '../common/PriceBadge.js';

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  onSaveToCalendar: (event: EventRecord) => void;
  onStartRegister: (event: EventRecord) => void;
}

const SUGGESTED_PROMPTS = [
  "Find me a hackathon next weekend I can get OD for, and tell me what I need to submit.",
  "Any AI hackathons this weekend?",
  "Free events in Koramangala next week",
  "Can I get OD leave for a two-day hackathon?",
  "Who owns the IP for what I build at a hackathon?"
];

export const AssistantDrawer: React.FC<AssistantDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  isLoading,
  onSaveToCalendar,
  onStartRegister
}) => {
  const [inputText, setInputText] = useState('');
  const [expandedSql, setExpandedSql] = useState<Record<string, boolean>>({});

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;
    onSendMessage(text);
    setInputText('');
  };

  const toggleSql = (msgId: string) => {
    setExpandedSql(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  return (
    <>
      {/* Floating Action Button (FAB) Bottom Right */}
      {!isOpen && (
        <button
          onClick={onClose}
          className="fixed bottom-6 right-6 z-40 bg-pulse text-paper border-3 border-ink shadow-hard-lg p-3.5 sm:px-4 sm:py-3 rounded-full flex items-center space-x-2.5 hover:scale-105 active:translate-x-0.5 active:translate-y-0.5 transition-transform"
        >
          <Sparkles className="w-5 h-5 text-acid" />
          <span className="font-display font-bold text-xs sm:text-sm uppercase tracking-wider hidden sm:inline">
            Ask CampusGenie
          </span>
        </button>
      )}

      {/* Slide-out Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-paper border-l-3 border-ink shadow-hard-lg flex flex-col animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-4 border-b-2 border-ink bg-paper-card flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-pulse border-2 border-ink text-acid">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-ink">CampusGenie Assistant</h3>
                <p className="text-[11px] text-slate font-medium">
                  Supervisor Agent · Text-to-SQL + Policy Corpus Citations
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-paper border border-transparent hover:border-ink transition-colors"
            >
              <X className="w-5 h-5 text-ink" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="py-6 space-y-4">
                <div className="p-3 bg-paper-card border-2 border-ink text-xs text-slate space-y-1">
                  <span className="font-display font-bold uppercase text-ink block">
                    Ask plain-English questions two ways:
                  </span>
                  <div>1. SQL queries against Databricks Lakehouse events database.</div>
                  <div>2. Verified citations from official college rulebooks and leave policies.</div>
                </div>

                {/* Prompt Suggestions */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-display font-bold uppercase tracking-wider text-slate">
                    Suggested Questions
                  </div>
                  {SUGGESTED_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(prompt)}
                      className="w-full text-left p-2.5 text-xs bg-paper border border-ink hover:bg-acid/40 transition-colors font-sans font-medium text-ink shadow-hard-sm block"
                    >
                      "{prompt}"
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className="space-y-2">
                  {/* Message Bubble */}
                  <div
                    className={`p-3 text-xs sm:text-sm leading-relaxed border-2 border-ink shadow-hard-sm ${
                      msg.sender === 'user'
                        ? 'bg-ink text-paper ml-8'
                        : 'bg-paper-card text-ink mr-4'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Assistant Extra Proofs */}
                  {msg.sender === 'assistant' && (
                    <div className="mr-4 space-y-2">
                      {/* Generated SQL Proof */}
                      {msg.sql && (
                        <div className="border border-ink bg-[#1E2029] text-gray-200 text-xs overflow-hidden">
                          <button
                            onClick={() => toggleSql(msg.id)}
                            className="w-full px-3 py-1.5 bg-[#14161B] border-b border-gray-700 flex items-center justify-between text-[11px] font-mono text-acid"
                          >
                            <span className="flex items-center space-x-1.5">
                              <Terminal className="w-3.5 h-3.5" />
                              <span>See generated SQL query (Databricks Genie)</span>
                            </span>
                            <span>{expandedSql[msg.id] ? 'Hide' : 'Show'}</span>
                          </button>
                          {expandedSql[msg.id] && (
                            <pre className="p-3 font-mono text-[11px] overflow-x-auto text-green-400 whitespace-pre-wrap">
                              {msg.sql}
                            </pre>
                          )}
                        </div>
                      )}

                      {/* Official Rulebook Citations */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="bg-acid/20 border-2 border-ink p-3 space-y-2">
                          <div className="flex items-center space-x-1.5 text-ink font-display font-bold text-xs uppercase tracking-wider">
                            <BookOpen className="w-3.5 h-3.5 text-pulse" />
                            <span>From the Official Rulebook (Knowledge Assistant)</span>
                          </div>
                          {msg.citations.map((cite, cIdx) => (
                            <div key={cIdx} className="bg-paper border border-ink p-2 text-xs">
                              <div className="font-bold text-ink text-[11px] mb-0.5">
                                {cite.doc_title} · <span className="text-pulse">{cite.clause}</span>
                              </div>
                              <blockquote className="italic text-slate text-[11px] pl-2 border-l-2 border-pulse">
                                "{cite.snippet}"
                              </blockquote>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Event Cards in Chat */}
                      {msg.rows && msg.rows.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {msg.rows.map(event => (
                            <div
                              key={event.event_id}
                              className="p-3 bg-paper border-2 border-ink shadow-hard-sm"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <h5 className="font-display font-bold text-xs text-ink truncate pr-2">
                                  {event.title}
                                </h5>
                                <PriceBadge isFree={event.is_free} feeInr={event.fee_inr} />
                              </div>
                              <p className="text-[11px] text-slate mb-2">
                                {event.venue} · {event.area}
                              </p>
                              <div className="flex space-x-2 pt-1 border-t border-ink/20">
                                <button
                                  onClick={() => onSaveToCalendar(event)}
                                  className="flex-1 py-1 px-2 text-[10px] font-display font-semibold border border-ink bg-paper hover:bg-acid text-ink flex items-center justify-center space-x-1"
                                >
                                  <BookmarkPlus className="w-3 h-3" />
                                  <span>Save to Calendar</span>
                                </button>
                                <button
                                  onClick={() => onStartRegister(event)}
                                  className="py-1 px-2.5 text-[10px] font-display font-bold bg-pulse text-paper border border-ink flex items-center justify-center space-x-1"
                                >
                                  <span>Register ↗</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {isLoading && (
              <div className="p-3 bg-paper-card border-2 border-ink shadow-hard-sm mr-4 text-xs font-mono text-pulse flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-pulse animate-ping" />
                <span>Supervisor agent routing Genie & Knowledge Assistant...</span>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="p-3 border-t-2 border-ink bg-paper-card flex items-center space-x-2">
            <input
              type="text"
              placeholder="Ask about events, leave rules, IP..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 px-3 py-2 bg-paper border-2 border-ink text-xs sm:text-sm font-sans placeholder:text-slate focus:outline-hidden focus:ring-2 focus:ring-pulse"
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !inputText.trim()}
              className="p-2.5 bg-pulse text-paper border-2 border-ink shadow-hard-sm hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-40 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
