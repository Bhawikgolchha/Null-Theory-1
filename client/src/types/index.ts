export interface EventRecord {
  event_id: string;
  title: string;
  description: string;
  short_pitch: string;
  category: 'hackathon' | 'tech_talk' | 'workshop' | 'cultural' | 'sports' | 'career_fair' | 'club_meet';
  subcategory: string;
  mode: 'offline' | 'online' | 'hybrid';
  venue: string;
  area: string;
  college: string;
  organizer: string;
  organizer_type: 'club' | 'company' | 'college' | 'community';
  start_ts: string;
  end_ts: string;
  duration_days: number;
  registration_deadline: string;
  is_free: boolean;
  fee_inr: number;
  prize_pool_inr: number;
  team_size_min: number;
  team_size_max: number;
  eligibility: string;
  capacity: number;
  registered_count: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  registration_url: string;
  registration_type: 'external' | 'platform_hosted';
  organizer_owned: boolean;
  organizer_contact: string;
  banner_url: string;
  rulebook_doc_id: string | null;
  status: 'open' | 'closing_soon' | 'closed';
  tags: string[];
  reason?: string;
  score?: number;
}

export interface UserSession {
  user_id: string;
  name: string;
  email: string;
  college: string;
  department: string;
  year: number;
  role: 'student' | 'organizer' | 'judge' | 'admin';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sql?: string;
  rows?: EventRecord[];
  citations?: {
    doc_title: string;
    clause: string;
    snippet: string;
  }[];
  timestamp: Date;
}

export interface RegistrationRecord {
  user_id: string;
  event_id: string;
  state: 'saved' | 'clicked_out' | 'self_confirmed' | 'verified' | 'attended' | 'cancelled';
  fidelity: 'intent' | 'self_reported' | 'verified';
  handoff_token?: string;
  clicked_out_ts?: string;
  confirmed_ts?: string;
  share_consent: boolean;
  name?: string;
  email?: string;
  department?: string;
  year?: number;
  updated_ts?: string;
}
