import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { authMiddleware, setActivePersona, DEMO_PERSONAS } from './middleware/auth.js';
import { warehouse } from './services/databricksWarehouse.js';
import { lakebase, SwipeRecord } from './services/lakebase.js';
import { recommender } from './services/recommender.js';
import { assistant } from './services/assistant.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(authMiddleware);

// --- 1. Events & Calendar API ---
app.get('/api/events', async (req, res) => {
  try {
    const { from, to, category, area, mode, free, q, college } = req.query;
    const events = await warehouse.getEvents({
      from: from as string,
      to: to as string,
      category: category as string,
      area: area as string,
      mode: mode as string,
      is_free: free !== undefined ? free === 'true' : undefined,
      q: q as string,
      college: college as string
    });
    res.json({ events, count: events.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await warehouse.getEventById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- 2. Swipe Feed & Swiping ---
app.get('/api/feed', async (req, res) => {
  try {
    const userId = req.user!.user_id;
    const feed = await recommender.getRankedFeed(userId, 20);
    res.json({ feed, count: feed.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/swipe', async (req, res) => {
  try {
    const userId = req.user!.user_id;
    const { swipes } = req.body as { swipes: SwipeRecord[] };
    if (!swipes || !Array.isArray(swipes)) {
      return res.status(400).json({ error: 'swipes array required' });
    }

    // Save to Lakebase Postgres hot storage
    await lakebase.recordSwipes(swipes.map(s => ({ ...s, user_id: userId })));

    // Update live tag affinities
    const tagDeltas: Record<string, number> = {};
    for (const s of swipes) {
      const event = await warehouse.getEventById(s.event_id);
      if (event) {
        const delta = s.direction === 'right' ? 1.0 : (s.direction === 'super' ? 2.0 : -0.5);
        for (const tag of event.tags) {
          tagDeltas[tag] = (tagDeltas[tag] || 0) + delta;
        }
      }
    }
    await lakebase.updateTagAffinity(userId, tagDeltas);

    res.json({ success: true, processed: swipes.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- 3. Registration Handoff, Consent & Confirmation ---
app.post('/api/events/:id/save', async (req, res) => {
  try {
    const userId = req.user!.user_id;
    await lakebase.saveRegistration({
      user_id: userId,
      event_id: req.params.id,
      state: 'saved',
      fidelity: 'intent',
      share_consent: false
    });
    res.json({ success: true, state: 'saved' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events/:id/register', async (req, res) => {
  try {
    const user = req.user!;
    const event = await warehouse.getEventById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const { share_consent } = req.body;
    const handoffToken = crypto.randomBytes(16).toString('hex');

    await lakebase.saveRegistration({
      user_id: user.user_id,
      event_id: event.event_id,
      state: 'clicked_out',
      fidelity: 'intent',
      handoff_token: handoffToken,
      clicked_out_ts: new Date(),
      share_consent: Boolean(share_consent),
      consent_ts: new Date(),
      name: user.name,
      email: user.email,
      department: user.department,
      year: user.year
    });

    res.json({
      handoff_token: handoffToken,
      registration_url: event.registration_url
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events/:id/confirm', async (req, res) => {
  try {
    const user = req.user!;
    const { completed, handoff_token } = req.body;

    if (completed) {
      await lakebase.saveRegistration({
        user_id: user.user_id,
        event_id: req.params.id,
        state: 'self_confirmed',
        fidelity: 'self_reported',
        handoff_token: handoff_token,
        confirmed_ts: new Date(),
        share_consent: true,
        name: user.name,
        email: user.email,
        department: user.department,
        year: user.year
      });
    }

    res.json({ success: true, fidelity: completed ? 'self_reported' : 'intent' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- 4. Assistant & Supervisor Gateway ---
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });

    const reply = await assistant.processQuery(message, conversationId);
    res.json(reply);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- 5. User Profile & Recommendations ---
app.get('/api/me', async (req, res) => {
  try {
    const user = req.user!;
    const affinities = await lakebase.getUserAffinities(user.user_id);
    const registrations = await lakebase.getUserRegistrations(user.user_id);
    res.json({ user, affinities, registrations });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recommendations', async (req, res) => {
  try {
    const userId = req.user!.user_id;
    const recs = await recommender.getTopRecommendations(userId);
    res.json(recs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- 6. Notifications ---
app.get('/api/notifications', async (req, res) => {
  try {
    const notifs = await lakebase.getNotifications(req.user!.user_id);
    res.json({ notifications: notifs, unreadCount: notifs.filter(n => !n.read_ts).length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/read', async (req, res) => {
  try {
    await lakebase.markNotificationsRead(req.user!.user_id, req.body.ids);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- 7. Organizer Dashboard & Fidelity ---
app.get('/api/organizer/events/:id/registrations', async (req, res) => {
  try {
    const records = await lakebase.getEventRegistrations(req.params.id);
    
    // Privacy and consent filtering
    const sanitized = records.map(r => {
      if (!r.share_consent) {
        return {
          user_id: 'anonymous',
          state: r.state,
          fidelity: r.fidelity,
          name: '(Anonymous Student)',
          email: '—',
          department: '—',
          year: '—',
          updated_ts: r.updated_ts
        };
      }
      return r;
    });

    const counts = {
      intent: records.filter(r => r.fidelity === 'intent').length,
      self_reported: records.filter(r => r.fidelity === 'self_reported').length,
      verified: records.filter(r => r.fidelity === 'verified').length,
      total: records.length,
      consented_count: records.filter(r => r.share_consent).length
    };

    res.json({ registrations: sanitized, counts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Demo Persona Switcher
app.get('/api/persona', (req, res) => {
  res.json({ current: req.user, available: DEMO_PERSONAS });
});

app.post('/api/persona', (req, res) => {
  const { persona } = req.body;
  if (DEMO_PERSONAS[persona]) {
    setActivePersona(persona);
    return res.json({ success: true, persona: DEMO_PERSONAS[persona] });
  }
  res.status(400).json({ error: 'Invalid persona' });
});

// --- 8. Serve Client Production Build (Databricks Single Container Port) ---
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  app.get('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });
}

// --- 9. Global Error Handler for Malformed JSON & Adversarial Payloads ---
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload' });
  }
  console.error('[CampusGenie Server Error]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(config.port, () => {
  console.log(`[CampusGenie] Server running on port ${config.port} (${config.nodeEnv})`);
});
