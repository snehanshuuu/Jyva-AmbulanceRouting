import { Vitals, PatientTrend, AgeBand } from '@/lib/types';
import { calculateTriageScore } from './score';

/**
 * Calculates patient physiological trend across sequential vitals measurements.
 */
export function calculateVitalsTrend(
  vitalsHistory: Vitals[],
  complaint: string = '',
  ageBand: AgeBand = 'ADULT'
): { trend: PatientTrend; scoreDelta: number; reasons: string[] } {
  if (!vitalsHistory || vitalsHistory.length <= 1) {
    return { trend: 'STABLE', scoreDelta: 0, reasons: ['Initial baseline reading established'] };
  }

  // Compare the most recent 2 or 3 readings
  const recent = vitalsHistory.slice(-3);
  const scores = recent.map((v) => calculateTriageScore(v, complaint, ageBand).score);

  const initialScore = scores[0];
  const latestScore = scores[scores.length - 1];
  const delta = latestScore - initialScore;

  if (delta >= 2) {
    return {
      trend: 'DETERIORATING',
      scoreDelta: delta,
      reasons: [`Triage acuity worsened by ${delta} points over last readings`, 'Clinical review required immediately'],
    };
  }

  if (delta <= -2) {
    return {
      trend: 'IMPROVING',
      scoreDelta: delta,
      reasons: [`Triage score improved by ${Math.abs(delta)} points`, 'Favorable physiological response to pre-hospital therapy'],
    };
  }

  return {
    trend: 'STABLE',
    scoreDelta: delta,
    reasons: ['Vitals remain hemodynamically consistent within tolerance window'],
  };
}
