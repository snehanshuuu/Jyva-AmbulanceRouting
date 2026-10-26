import { Edge } from '@/lib/types';

/**
 * Calculates time-of-day traffic congestion multiplier based on the hour.
 * Models real Mumbai traffic dynamics:
 * - Morning peak (08:30 - 11:00): Commuters heading towards Lower Parel / Nariman Point / BKC
 * - Evening peak (17:30 - 20:30): Return rush northbound
 * - Late night (23:00 - 05:00): Low free-flow
 */
export function getTimeOfDayCongestionFactor(date: Date = new Date()): number {
  const hour = date.getHours() + date.getMinutes() / 60;

  if (hour >= 8.5 && hour <= 11) {
    return 1.40; // Morning rush
  }
  if (hour >= 17.5 && hour <= 20.5) {
    return 1.55; // Evening peak
  }
  if (hour >= 23 || hour <= 5) {
    return 0.35; // Late night free flow
  }
  return 1.0; // Standard daylight baseline
}

/**
 * Determines road class multiplier:
 * Arterial expressways (Dr. Ambedkar Rd, Mahim Causeway) vs. local hospital approach spurs.
 */
export function getRoadClassMultiplier(edge: Edge): number {
  const edgeName = (edge.name || '').toLowerCase();
  const isArterial =
    edge.baseSpeedKmh >= 50 ||
    edgeName.includes('ambedkar') ||
    edgeName.includes('causeway') ||
    edgeName.includes('arterial');

  return isArterial ? 1.15 : 0.90;
}

/**
 * Pure function that simulates subtle natural traffic fluctuations per simulation tick.
 * Respects road closures, clamps congestion to [0.05, 0.95].
 */
export function simulateTrafficFluctuation(
  edges: Edge[],
  simDate: Date = new Date(),
  applyNoise: boolean = true
): Edge[] {
  const timeFactor = getTimeOfDayCongestionFactor(simDate);

  return edges.map((edge) => {
    if (edge.closed) {
      return edge;
    }

    const roadClassFactor = getRoadClassMultiplier(edge);
    // Micro noise +/- 0.015 per tick
    const noise = applyNoise ? (Math.random() - 0.5) * 0.03 : 0;

    // Weight current congestion heavily (98%) and apply subtle time-of-day pull + noise (2%)
    const targetCongestion = edge.congestion * (0.85 + 0.15 * timeFactor * roadClassFactor) + noise;
    const smoothed = edge.congestion * 0.95 + targetCongestion * 0.05;
    const clamped = Math.max(0.05, Math.min(0.95, smoothed));

    return {
      ...edge,
      congestion: Math.round(clamped * 100) / 100,
    };
  });
}
