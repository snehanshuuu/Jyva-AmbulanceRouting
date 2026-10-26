import { Signal, SignalState } from '@/lib/types';
import defaultSignals from '@/data/signals.json';

/**
 * Adapter interface for city traffic signal controllers (SCATS / SCOOT / UTMC / Simulated).
 */
export interface SignalController {
  getSignals(): Promise<Signal[]>;
  getSignal(signalId: string): Promise<Signal | null>;
  requestPreempt(
    signalId: string,
    ambulanceId: string,
    etaS: number,
    priorityLevel: string
  ): Promise<'GRANTED' | 'DENIED'>;
  releasePreempt(signalId: string): Promise<void>;
  updateSignalState(signalId: string, state: SignalState): Promise<void>;
}

/**
 * In-memory simulated signal controller.
 */
export class SimulatedSignals implements SignalController {
  private signals: Map<string, Signal> = new Map();

  constructor(initialSignals?: Signal[]) {
    const list = initialSignals || (defaultSignals as Signal[]);
    for (const sig of list) {
      this.signals.set(sig.id, { ...sig });
    }
  }

  async getSignals(): Promise<Signal[]> {
    return Array.from(this.signals.values());
  }

  async getSignal(signalId: string): Promise<Signal | null> {
    return this.signals.get(signalId) ?? null;
  }

  async requestPreempt(
    signalId: string,
    ambulanceId: string,
    etaS: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _priorityLevel: string
  ): Promise<'GRANTED' | 'DENIED'> {
    const signal = this.signals.get(signalId);
    if (!signal) return 'DENIED';

    // If signal is in GREEN_HOLD for another unit, resolve conflict
    if (signal.state === 'GREEN_HOLD' && signal.preemptAmbulanceId !== ambulanceId) {
      // Lower ETA takes precedence in conflict resolution
      if (signal.activePreemptEtaS && etaS >= signal.activePreemptEtaS) {
        return 'DENIED';
      }
    }

    signal.state = etaS <= 15 ? 'GREEN_HOLD' : 'PREEMPT_REQUESTED';
    signal.activePreemptEtaS = etaS;
    signal.preemptAmbulanceId = ambulanceId;
    signal.timeInCurrentStateS = 0;
    this.signals.set(signalId, signal);
    return 'GRANTED';
  }

  async releasePreempt(signalId: string): Promise<void> {
    const signal = this.signals.get(signalId);
    if (!signal) return;

    signal.state = 'RECOVERY';
    signal.activePreemptEtaS = 0;
    signal.preemptAmbulanceId = undefined;
    signal.timeInCurrentStateS = 0;
    this.signals.set(signalId, signal);
  }

  async updateSignalState(signalId: string, state: SignalState): Promise<void> {
    const signal = this.signals.get(signalId);
    if (!signal) return;
    signal.state = state;
    signal.timeInCurrentStateS = 0;
    this.signals.set(signalId, signal);
  }
}

export const globalSignalAdapter = new SimulatedSignals();
