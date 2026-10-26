import { Signal } from '@/lib/types';

export const PREEMPT_TRIGGER_ETA_S = 40; // ETA threshold to request signal pre-emption
export const GREEN_HOLD_TRIGGER_ETA_S = 15; // ETA threshold to turn green hold
export const RECOVERY_DURATION_S = 20; // Time needed to flush cross-traffic

export interface SignalTransitionResult {
  updatedSignal: Signal;
  didTransition: boolean;
  reason: string;
}

/**
 * Pure state machine transition for a traffic signal along the emergency corridor.
 */
export function transitionSignalState(
  signal: Signal,
  ambulanceEtaS: number | null,
  elapsedSeconds: number = 1
): SignalTransitionResult {
  const next: Signal = { ...signal };
  next.timeInCurrentStateS = (next.timeInCurrentStateS || 0) + elapsedSeconds;

  let didTransition = false;
  let reason = 'Signal in steady state';

  switch (signal.state) {
    case 'NORMAL':
      if (ambulanceEtaS !== null && ambulanceEtaS <= PREEMPT_TRIGGER_ETA_S && ambulanceEtaS > 0) {
        next.state = 'PREEMPT_REQUESTED';
        next.activePreemptEtaS = ambulanceEtaS;
        next.timeInCurrentStateS = 0;
        didTransition = true;
        reason = `Ambulance ETA <= ${PREEMPT_TRIGGER_ETA_S}s; requested green corridor pre-emption`;
      }
      break;

    case 'PREEMPT_REQUESTED':
      if (ambulanceEtaS === null || ambulanceEtaS > PREEMPT_TRIGGER_ETA_S + 10) {
        // Cancelled or re-routed away
        next.state = 'NORMAL';
        next.activePreemptEtaS = 0;
        next.timeInCurrentStateS = 0;
        didTransition = true;
        reason = 'Ambulance route diverted or completed; cancelled pre-emption';
      } else if (ambulanceEtaS <= GREEN_HOLD_TRIGGER_ETA_S) {
        next.state = 'GREEN_HOLD';
        next.activePreemptEtaS = ambulanceEtaS;
        next.timeInCurrentStateS = 0;
        didTransition = true;
        reason = `Ambulance approaching junction (ETA ${Math.round(ambulanceEtaS)}s); signal locked GREEN`;
      } else {
        next.activePreemptEtaS = ambulanceEtaS;
      }
      break;

    case 'GREEN_HOLD':
      if (ambulanceEtaS !== null && ambulanceEtaS <= 0) {
        // Ambulance has crossed junction
        next.state = 'RECOVERY';
        next.activePreemptEtaS = 0;
        next.timeInCurrentStateS = 0;
        didTransition = true;
        reason = 'Ambulance cleared intersection; entering recovery cycle to balance cross-traffic';
      }
      break;

    case 'RECOVERY':
      if ((next.timeInCurrentStateS || 0) >= RECOVERY_DURATION_S) {
        next.state = 'NORMAL';
        next.timeInCurrentStateS = 0;
        next.activePreemptEtaS = 0;
        didTransition = true;
        reason = 'Cross-traffic successfully flushed; returned to standard adaptive signal timing';
      }
      break;
  }

  return { updatedSignal: next, didTransition, reason };
}

/**
 * Calculates total seconds of delay avoided by pre-emption along a route.
 */
export function calculateCorridorDelayAvoided(signals: Signal[]): number {
  return signals.reduce((total, sig) => {
    if (sig.state === 'GREEN_HOLD' || sig.state === 'RECOVERY') {
      return total + sig.baseDelayS;
    }
    return total;
  }, 0);
}
