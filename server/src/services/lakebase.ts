import { Pool } from 'pg';
import { config } from '../config.js';

export interface SwipeRecord {
  swipe_id?: number;
  user_id: string;
  event_id: string;
  direction: 'right' | 'left' | 'super';
  dwell_ms: number;
  surface: string;
  swiped_ts?: Date;
}

export interface RegistrationRecord {
  user_id: string;
  event_id: string;
  state: 'saved' | 'clicked_out' | 'self_confirmed' | 'verified' | 'attended' | 'cancelled';
  fidelity: 'intent' | 'self_reported' | 'verified';
  handoff_token?: string;
  clicked_out_ts?: Date;
  confirmed_ts?: Date;
  share_consent: boolean;
  consent_ts?: Date;
  updated_ts?: Date;
  name?: string;
  email?: string;
  department?: string;
  year?: number;
}

export interface NotificationRecord {
  notification_id?: number;
  user_id: string;
  event_id: string;
  kind: string;
  title: string;
  body: string;
  reason: string;
  created_ts: Date;
  read_ts?: Date | null;
}

export interface LakebaseHealthStatus {
  status: 'healthy' | 'degraded' | 'in_memory';
  isConnected: boolean;
  mode: 'postgres' | 'memory_fallback';
  lastKeepaliveTs: Date | null;
  totalSwipesInMemory: number;
  totalRegistrationsInMemory: number;
  poolMetrics?: {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  };
}

class LakebaseService {
  private pool: Pool | null = null;
  private isConnected = false;
  private keepaliveTimer: NodeJS.Timeout | null = null;
  private lastKeepaliveTs: Date | null = null;

  // In-memory fallback for hot OLTP when Lakebase Postgres is in local/dev mock mode
  private memorySwipes: SwipeRecord[] = [];
  private memoryRegistrations: Map<string, RegistrationRecord> = new Map();
  private memoryAffinities: Map<string, Map<string, number>> = new Map();
  private memoryNotifications: NotificationRecord[] = [];

  constructor() {
    if (config.lakebaseConnectionUrl) {
      try {
        this.pool = new Pool({
          connectionString: config.lakebaseConnectionUrl,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
          ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false
        });

        this.pool.on('error', (err) => {
          console.warn('[Lakebase] PostgreSQL pool idle client error (retaining service availability):', err.message);
        });

        this.initSchema();
        this.startKeepalive();
      } catch (err) {
        console.warn('[Lakebase] PostgreSQL connection failed, falling back to in-memory OLTP store:', err);
      }
    } else {
      console.log('[Lakebase] No LAKEBASE_URL configured. Running with in-memory transactional store.');
    }
  }

  private async initSchema() {
    if (!this.pool) return;
    let client;
    try {
      client = await this.pool.connect();
      await client.query(`
        CREATE TABLE IF NOT EXISTS swipes (
          swipe_id BIGSERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          event_id TEXT NOT NULL,
          direction TEXT NOT NULL,
          dwell_ms INT,
          surface TEXT,
          swiped_ts TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_swipes_user ON swipes (user_id, swiped_ts DESC);

        CREATE TABLE IF NOT EXISTS registrations (
          user_id TEXT NOT NULL,
          event_id TEXT NOT NULL,
          state TEXT NOT NULL,
          fidelity TEXT NOT NULL,
          handoff_token TEXT,
          clicked_out_ts TIMESTAMPTZ,
          confirmed_ts TIMESTAMPTZ,
          share_consent BOOLEAN DEFAULT false,
          consent_ts TIMESTAMPTZ,
          updated_ts TIMESTAMPTZ DEFAULT now(),
          name TEXT,
          email TEXT,
          department TEXT,
          year INT,
          PRIMARY KEY (user_id, event_id)
        );

        CREATE TABLE IF NOT EXISTS notifications (
          notification_id BIGSERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          event_id TEXT,
          kind TEXT,
          title TEXT,
          body TEXT,
          reason TEXT,
          created_ts TIMESTAMPTZ DEFAULT now(),
          read_ts TIMESTAMPTZ
        );

        CREATE TABLE IF NOT EXISTS tag_affinity_live (
          user_id TEXT NOT NULL,
          tag TEXT NOT NULL,
          weight DOUBLE PRECISION NOT NULL,
          updated_ts TIMESTAMPTZ DEFAULT now(),
          PRIMARY KEY (user_id, tag)
        );
      `);
      this.isConnected = true;
      this.lastKeepaliveTs = new Date();
      console.log('[Lakebase] PostgreSQL tables verified.');
    } catch (err: any) {
      console.warn('[Lakebase] Schema initialization warning (using in-memory OLTP fallback):', err.message);
      this.isConnected = false;
    } finally {
      if (client) client.release();
    }
  }

  private startKeepalive() {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
    }

    // Keepalive ping every 5 minutes to ensure connection health and prevent timeouts
    this.keepaliveTimer = setInterval(async () => {
      if (this.pool) {
        let client;
        try {
          client = await this.pool.connect();
          await client.query('SELECT 1');
          this.isConnected = true;
          this.lastKeepaliveTs = new Date();
        } catch (err: any) {
          console.warn('[Lakebase] Keepalive SELECT 1 ping notice (degraded state):', err.message);
          this.isConnected = false;
        } finally {
          if (client) client.release();
        }
      }
    }, 5 * 60 * 1000);
  }

  // --- Swipes ---
  async recordSwipes(swipes: SwipeRecord[]) {
    for (const swipe of swipes) {
      this.memorySwipes.push({ ...swipe, swiped_ts: new Date() });
    }

    if (this.pool && this.isConnected) {
      let client;
      try {
        client = await this.pool.connect();
        for (const s of swipes) {
          await client.query(
            `INSERT INTO swipes (user_id, event_id, direction, dwell_ms, surface) VALUES ($1, $2, $3, $4, $5)`,
            [s.user_id, s.event_id, s.direction, s.dwell_ms, s.surface]
          );
        }
      } catch (err) {
        console.error('[Lakebase] Error recording swipes to Postgres:', err);
      } finally {
        if (client) client.release();
      }
    }
  }

  async getSwipedEventIds(userId: string): Promise<Set<string>> {
    const swiped = new Set<string>();
    for (const s of this.memorySwipes) {
      if (s.user_id === userId) {
        swiped.add(s.event_id);
      }
    }
    return swiped;
  }

  // --- Tag Affinity Live ---
  async updateTagAffinity(userId: string, tagDeltas: Record<string, number>) {
    if (!this.memoryAffinities.has(userId)) {
      this.memoryAffinities.set(userId, new Map());
    }
    const userAffinities = this.memoryAffinities.get(userId)!;

    for (const [tag, delta] of Object.entries(tagDeltas)) {
      const current = userAffinities.get(tag) || 0;
      userAffinities.set(tag, Math.max(0, current + delta));

      if (this.pool && this.isConnected) {
        try {
          await this.pool.query(
            `INSERT INTO tag_affinity_live (user_id, tag, weight, updated_ts)
             VALUES ($1, $2, $3, now())
             ON CONFLICT (user_id, tag)
             DO UPDATE SET weight = GREATEST(0.0, tag_affinity_live.weight + $3), updated_ts = now()`,
            [userId, tag, delta]
          );
        } catch (err) {
          console.error('[Lakebase] Error updating tag affinity:', err);
        }
      }
    }
  }

  async getUserAffinities(userId: string): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    const map = this.memoryAffinities.get(userId);
    if (map) {
      for (const [tag, weight] of map.entries()) {
        result[tag] = weight;
      }
    }
    return result;
  }

  // --- Registrations & Fidelity ---
  async saveRegistration(reg: RegistrationRecord) {
    const key = `${reg.user_id}:${reg.event_id}`;
    const existing = this.memoryRegistrations.get(key) || {};
    const updated = { ...existing, ...reg, updated_ts: new Date() };
    this.memoryRegistrations.set(key, updated as RegistrationRecord);

    if (this.pool && this.isConnected) {
      try {
        await this.pool.query(
          `INSERT INTO registrations (
            user_id, event_id, state, fidelity, handoff_token,
            clicked_out_ts, confirmed_ts, share_consent, consent_ts, updated_ts,
            name, email, department, year
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10, $11, $12, $13)
          ON CONFLICT (user_id, event_id)
          DO UPDATE SET
            state = EXCLUDED.state,
            fidelity = EXCLUDED.fidelity,
            handoff_token = COALESCE(EXCLUDED.handoff_token, registrations.handoff_token),
            clicked_out_ts = COALESCE(EXCLUDED.clicked_out_ts, registrations.clicked_out_ts),
            confirmed_ts = COALESCE(EXCLUDED.confirmed_ts, registrations.confirmed_ts),
            share_consent = COALESCE(EXCLUDED.share_consent, registrations.share_consent),
            consent_ts = COALESCE(EXCLUDED.consent_ts, registrations.consent_ts),
            updated_ts = now(),
            name = COALESCE(EXCLUDED.name, registrations.name),
            email = COALESCE(EXCLUDED.email, registrations.email),
            department = COALESCE(EXCLUDED.department, registrations.department),
            year = COALESCE(EXCLUDED.year, registrations.year)`,
          [
            reg.user_id, reg.event_id, reg.state, reg.fidelity, reg.handoff_token || null,
            reg.clicked_out_ts || null, reg.confirmed_ts || null, reg.share_consent, reg.consent_ts || null,
            reg.name || null, reg.email || null, reg.department || null, reg.year || null
          ]
        );
      } catch (err) {
        console.error('[Lakebase] Error saving registration:', err);
      }
    }
  }

  async getUserRegistrations(userId: string): Promise<RegistrationRecord[]> {
    const res: RegistrationRecord[] = [];
    for (const reg of this.memoryRegistrations.values()) {
      if (reg.user_id === userId) {
        res.push(reg);
      }
    }
    return res;
  }

  async getEventRegistrations(eventId: string): Promise<RegistrationRecord[]> {
    const res: RegistrationRecord[] = [];
    for (const reg of this.memoryRegistrations.values()) {
      if (reg.event_id === eventId) {
        res.push(reg);
      }
    }
    return res;
  }

  // --- Notifications ---
  async addNotification(notif: NotificationRecord) {
    this.memoryNotifications.unshift(notif);
  }

  async getNotifications(userId: string): Promise<NotificationRecord[]> {
    return this.memoryNotifications.filter(n => n.user_id === userId);
  }

  async markNotificationsRead(userId: string, ids?: number[]) {
    for (const n of this.memoryNotifications) {
      if (n.user_id === userId && (!ids || (n.notification_id && ids.includes(n.notification_id)))) {
        n.read_ts = new Date();
      }
    }
  }

  // --- Health & Diagnostic Metrics ---
  getHealthStatus(): LakebaseHealthStatus {
    return {
      status: this.isConnected ? 'healthy' : (this.pool ? 'degraded' : 'in_memory'),
      isConnected: this.isConnected,
      mode: this.isConnected ? 'postgres' : 'memory_fallback',
      lastKeepaliveTs: this.lastKeepaliveTs,
      totalSwipesInMemory: this.memorySwipes.length,
      totalRegistrationsInMemory: this.memoryRegistrations.size,
      poolMetrics: this.pool ? {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      } : undefined
    };
  }

  async close() {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
    }
  }
}

export const lakebase = new LakebaseService();
