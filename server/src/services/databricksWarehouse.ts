import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DBSQLClient } from '@databricks/sql';
import { config } from '../config.js';
import { EventRecord } from '../data/seedGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface EventFilter {
  from?: string;
  to?: string;
  category?: string;
  area?: string;
  mode?: string;
  is_free?: boolean;
  q?: string;
  college?: string;
}

export interface WarehouseHealthStatus {
  status: 'healthy' | 'degraded' | 'local_replica';
  isConnected: boolean;
  host: string;
  catalog: string;
  schema: string;
  lastKeepaliveTs: Date | null;
  cachedQueriesCount: number;
  totalLocalEventsCount: number;
}

class WarehouseService {
  private client: DBSQLClient | null = null;
  private localEvents: EventRecord[] = [];
  private isConnected = false;
  private keepaliveTimer: NodeJS.Timeout | null = null;
  private lastKeepaliveTs: Date | null = null;
  private cache: Map<string, { timestamp: number; data: EventRecord[] }> = new Map();
  private cacheTTL = 60 * 1000; // 60s TTL

  constructor() {
    this.loadLocalSeed();
    this.initWarehouseConnection();
    this.startKeepalive();
  }

  private loadLocalSeed() {
    try {
      const seedPath = path.resolve(__dirname, '../data/seed_events.json');
      if (fs.existsSync(seedPath)) {
        const raw = fs.readFileSync(seedPath, 'utf8');
        this.localEvents = JSON.parse(raw);
        console.log(`[Warehouse] Loaded ${this.localEvents.length} local events for gold replica.`);
      }
    } catch (err) {
      console.warn('[Warehouse] Could not load seed_events.json:', err);
    }
  }

  private async initWarehouseConnection() {
    if (!config.databricksHost || !config.databricksHttpPath || !config.databricksToken) {
      console.log('[Warehouse] Databricks credentials not fully set. Running in local Lakehouse replica mode.');
      return;
    }

    try {
      this.client = new DBSQLClient();
      await this.client.connect({
        host: config.databricksHost,
        path: config.databricksHttpPath,
        token: config.databricksToken
      });
      this.isConnected = true;
      this.lastKeepaliveTs = new Date();
      console.log('[Warehouse] Connected to Databricks Serverless SQL Warehouse.');
    } catch (err: any) {
      console.warn('[Warehouse] Failed connecting to Databricks SQL Warehouse, using local seed fallback:', err.message);
      this.isConnected = false;
    }
  }

  private startKeepalive() {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
    }

    // Keepalive every 10 minutes to avoid 30m auto-stop cold start mid-demo
    this.keepaliveTimer = setInterval(async () => {
      if (this.client) {
        let session;
        let query;
        try {
          session = await this.client.openSession();
          query = await session.executeStatement('SELECT 1');
          await query.fetchAll();
          this.isConnected = true;
          this.lastKeepaliveTs = new Date();
          console.log('[Warehouse] Keepalive SELECT 1 ping succeeded.');
        } catch (err: any) {
          console.warn('[Warehouse] Keepalive ping notice (retaining service availability):', err.message);
          this.isConnected = false;
        } finally {
          if (query) {
            try { await query.close(); } catch (_) {}
          }
          if (session) {
            try { await session.close(); } catch (_) {}
          }
        }
      }
    }, 10 * 60 * 1000);
  }

  async executeWarehouseQuery(sql: string): Promise<Record<string, any>[] | null> {
    if (!this.client || !this.isConnected) {
      return null;
    }

    let session;
    let query;
    try {
      session = await this.client.openSession();
      query = await session.executeStatement(sql);
      const rows = await query.fetchAll();
      return rows as Record<string, any>[];
    } catch (err: any) {
      console.warn('[Warehouse] Query execution error against Databricks SQL Warehouse:', err.message);
      return null;
    } finally {
      if (query) {
        try { await query.close(); } catch (_) {}
      }
      if (session) {
        try { await session.close(); } catch (_) {}
      }
    }
  }

  async getEvents(filters: EventFilter = {}): Promise<EventRecord[]> {
    const cacheKey = JSON.stringify(filters);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    let results = [...this.localEvents];

    if (filters.from) {
      const fromDate = new Date(filters.from).getTime();
      results = results.filter(e => new Date(e.start_ts).getTime() >= fromDate);
    }
    if (filters.to) {
      const toDate = new Date(filters.to).getTime();
      results = results.filter(e => new Date(e.start_ts).getTime() <= toDate);
    }
    if (filters.category && filters.category !== 'all') {
      results = results.filter(e => e.category.toLowerCase() === filters.category!.toLowerCase());
    }
    if (filters.area && filters.area !== 'all') {
      results = results.filter(e => e.area.toLowerCase() === filters.area!.toLowerCase());
    }
    if (filters.mode && filters.mode !== 'all') {
      results = results.filter(e => e.mode.toLowerCase() === filters.mode!.toLowerCase());
    }
    if (filters.is_free !== undefined) {
      results = results.filter(e => e.is_free === filters.is_free);
    }
    if (filters.college && filters.college !== 'all') {
      results = results.filter(e => e.college.toLowerCase().includes(filters.college!.toLowerCase()));
    }
    if (filters.q) {
      const q = filters.q.toLowerCase();
      results = results.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.short_pitch.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q)) ||
        e.area.toLowerCase().includes(q) ||
        e.college.toLowerCase().includes(q)
      );
    }

    // Sort ascending by start date
    results.sort((a, b) => new Date(a.start_ts).getTime() - new Date(b.start_ts).getTime());

    this.cache.set(cacheKey, { timestamp: Date.now(), data: results });
    return results;
  }

  async getEventById(id: string): Promise<EventRecord | null> {
    const event = this.localEvents.find(e => e.event_id === id);
    return event || null;
  }

  getAllEvents(): EventRecord[] {
    return this.localEvents;
  }

  getHealthStatus(): WarehouseHealthStatus {
    return {
      status: this.isConnected ? 'healthy' : (this.client ? 'degraded' : 'local_replica'),
      isConnected: this.isConnected,
      host: config.databricksHost || 'local_mock',
      catalog: config.databricksCatalog,
      schema: config.databricksSchema,
      lastKeepaliveTs: this.lastKeepaliveTs,
      cachedQueriesCount: this.cache.size,
      totalLocalEventsCount: this.localEvents.length
    };
  }

  async close() {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
    if (this.client) {
      try {
        await this.client.close();
      } catch (_) {}
      this.isConnected = false;
    }
  }
}

export const warehouse = new WarehouseService();
