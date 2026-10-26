export interface SyncAdapter {
  publish(channel: 'hospitals' | 'trips' | 'reset', payload?: unknown): void;
  subscribe(channel: 'hospitals' | 'trips' | 'reset', cb: (payload: unknown) => void): () => void;
}
