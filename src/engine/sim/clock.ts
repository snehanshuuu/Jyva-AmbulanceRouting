export interface SimClockState {
  isRunning: boolean;
  speedMultiplier: number; // 1, 2, 5, 10
  elapsedSimSeconds: number;
  simTimestampMs: number; // Simulated wall-clock epoch ms
  realStartTimeMs: number;
}

export function createInitialClockState(baseDate?: Date): SimClockState {
  const baseMs = baseDate ? baseDate.getTime() : Date.now();
  return {
    isRunning: true,
    speedMultiplier: 1,
    elapsedSimSeconds: 0,
    simTimestampMs: baseMs,
    realStartTimeMs: Date.now(),
  };
}

export function advanceClock(state: SimClockState, deltaSeconds: number = 1): SimClockState {
  if (!state.isRunning) return state;

  const effectiveDeltaS = deltaSeconds * state.speedMultiplier;
  const deltaMs = effectiveDeltaS * 1000;

  return {
    ...state,
    elapsedSimSeconds: state.elapsedSimSeconds + effectiveDeltaS,
    simTimestampMs: state.simTimestampMs + deltaMs,
  };
}

export function setClockSpeed(state: SimClockState, speedMultiplier: number): SimClockState {
  const validMultiplier = Math.max(1, Math.min(10, speedMultiplier));
  return {
    ...state,
    speedMultiplier: validMultiplier,
  };
}

export function setClockRunning(state: SimClockState, isRunning: boolean): SimClockState {
  return {
    ...state,
    isRunning,
  };
}

export function formatSimClockTime(simTimestampMs: number): string {
  const d = new Date(simTimestampMs);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}
