import { LatLng } from '@/lib/types';

/**
 * Adapter interface for GPS providers (simulated or live hardware).
 * Path to real integration: can swap SimulatedGps with LiveMqttGps or WebGps.
 */
export interface GpsProvider {
  subscribe(ambId: string, cb: (pos: LatLng, heading?: number, speedKmh?: number) => void): () => void;
  updatePosition(ambId: string, pos: LatLng, heading?: number, speedKmh?: number): void;
  getCurrentPosition(ambId: string): LatLng | null;
}

/**
 * Simulated GPS provider maintaining in-memory subscriber callbacks.
 */
export class SimulatedGps implements GpsProvider {
  private subscribers: Map<string, Set<(pos: LatLng, heading?: number, speedKmh?: number) => void>> = new Map();
  private currentPositions: Map<string, { pos: LatLng; heading?: number; speedKmh?: number }> = new Map();

  subscribe(ambId: string, cb: (pos: LatLng, heading?: number, speedKmh?: number) => void): () => void {
    if (!this.subscribers.has(ambId)) {
      this.subscribers.set(ambId, new Set());
    }
    this.subscribers.get(ambId)!.add(cb);

    // Immediately push last known position if exists
    const last = this.currentPositions.get(ambId);
    if (last) {
      cb(last.pos, last.heading, last.speedKmh);
    }

    return () => {
      const set = this.subscribers.get(ambId);
      if (set) {
        set.delete(cb);
        if (set.size === 0) {
          this.subscribers.delete(ambId);
        }
      }
    };
  }

  updatePosition(ambId: string, pos: LatLng, heading?: number, speedKmh?: number): void {
    this.currentPositions.set(ambId, { pos, heading, speedKmh });
    const listeners = this.subscribers.get(ambId);
    if (listeners) {
      for (const cb of listeners) {
        try {
          cb(pos, heading, speedKmh);
        } catch (err) {
          console.error(`Error in GPS subscriber for ${ambId}:`, err);
        }
      }
    }
  }

  getCurrentPosition(ambId: string): LatLng | null {
    return this.currentPositions.get(ambId)?.pos ?? null;
  }
}

export const globalGpsAdapter = new SimulatedGps();
