import { warehouse } from './databricksWarehouse.js';
import { lakebase } from './lakebase.js';
import { EventRecord } from '../data/seedGenerator.js';

export interface RankedEvent extends EventRecord {
  score: number;
  reason: string;
}

class RecommenderService {
  async getRankedFeed(userId: string, limit: number = 20): Promise<RankedEvent[]> {
    const allEvents = warehouse.getAllEvents();
    const swipedIds = await lakebase.getSwipedEventIds(userId);
    const userAffinities = await lakebase.getUserAffinities(userId);

    // Filter unswiped events that are in the future or open
    const unswiped = allEvents.filter(e => !swipedIds.has(e.event_id) && e.status !== 'closed');

    const ranked: RankedEvent[] = unswiped.map(event => {
      // 1. Tag affinity normalized
      let affinitySum = 0;
      let topMatchedTag = '';
      let topTagWeight = -1;

      for (const tag of event.tags) {
        const w = userAffinities[tag] || 0;
        affinitySum += w;
        if (w > topTagWeight) {
          topTagWeight = w;
          topMatchedTag = tag;
        }
      }
      const tagAffinityNorm = Math.min(Math.max(affinitySum / (event.tags.length || 1), 0), 5) / 5;

      // 2. Popularity norm
      const popularityNorm = Math.min((event.registered_count || 0) / (event.capacity || 100), 1.0);

      // 3. Urgency
      const now = Date.now();
      const daysUntil = Math.max((new Date(event.start_ts).getTime() - now) / 86400000, 0);
      const urgency = 1 / (1 + daysUntil);

      // 4. Proximity
      const proximity = event.mode === 'offline' ? 0.8 : 0.4;

      // Compute composite score
      const score = (
        0.50 * tagAffinityNorm +
        0.15 * popularityNorm +
        0.15 * urgency +
        0.10 * proximity +
        0.10 * 0.5
      );

      // Determine human readable reason
      let reason = 'Trending among Bangalore engineering students';
      if (topTagWeight > 1) {
        reason = `Matches your interest in ${topMatchedTag.replace('_', ' ').toUpperCase()}`;
      } else if (daysUntil <= 3) {
        reason = `Happening soon in ${event.area} (${Math.ceil(daysUntil)} days left)`;
      } else if (event.prize_pool_inr >= 100000) {
        reason = `High prize pool: ₹${(event.prize_pool_inr / 100000).toFixed(1)}L`;
      } else if (event.is_free) {
        reason = `Free entry at ${event.college.split(' ')[0]}`;
      }

      return {
        ...event,
        score,
        reason
      };
    });

    // Sort descending by score
    ranked.sort((a, b) => b.score - a.score);
    return ranked.slice(0, limit);
  }

  async getTopRecommendations(userId: string): Promise<RankedEvent[]> {
    return this.getRankedFeed(userId, 6);
  }
}

export const recommender = new RecommenderService();
