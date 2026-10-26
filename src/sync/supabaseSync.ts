import { SyncAdapter } from './syncAdapter';
import { broadcastSync } from './broadcastSync';

/**
 * Supabase Realtime sync adapter.
 * Uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY when configured;
 * otherwise automatically falls back to same-browser BroadcastChannel sync.
 */
class SupabaseSyncAdapter implements SyncAdapter {
  private hasSupabase = false;

  constructor() {
    this.hasSupabase = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }

  publish(channel: 'hospitals' | 'trips' | 'reset', payload?: unknown): void {
    // Always publish to local BroadcastChannel for same-device multi-tab speed
    broadcastSync.publish(channel, payload);

    if (this.hasSupabase && channel !== 'reset') {
      // Optional multi-device broadcast via Supabase Realtime REST broadcast endpoint
      try {
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/broadcast_${channel}`, {
          method: 'POST',
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ payload }),
        }).catch(() => {
          // Silent fallback to local broadcast
        });
      } catch {
        // Fallback
      }
    }
  }

  subscribe(channel: 'hospitals' | 'trips' | 'reset', cb: (payload: unknown) => void): () => void {
    return broadcastSync.subscribe(channel, cb);
  }
}

export const sync = new SupabaseSyncAdapter();
