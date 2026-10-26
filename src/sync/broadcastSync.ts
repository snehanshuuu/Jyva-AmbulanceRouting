import { SyncAdapter } from './syncAdapter';

class BroadcastSyncAdapter implements SyncAdapter {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<(payload: unknown) => void>> = new Map();

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('jyva-realtime-sync');
      this.channel.onmessage = (event) => {
        const { channel, payload } = event.data || {};
        if (channel && this.listeners.has(channel)) {
          this.listeners.get(channel)!.forEach((cb) => {
            try {
              cb(payload);
            } catch (err) {
              console.error('Error in BroadcastChannel listener', err);
            }
          });
        }
      };
    }
  }

  publish(channel: 'hospitals' | 'trips' | 'reset', payload?: unknown): void {
    if (this.channel) {
      this.channel.postMessage({ channel, payload });
    }
  }

  subscribe(channel: 'hospitals' | 'trips' | 'reset', cb: (payload: unknown) => void): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(cb);

    return () => {
      this.listeners.get(channel)?.delete(cb);
    };
  }
}

export const broadcastSync = new BroadcastSyncAdapter();
