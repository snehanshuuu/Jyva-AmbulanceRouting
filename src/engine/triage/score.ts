import { Vitals, PatientPriority, AgeBand } from '@/lib/types';
import { scoreVitalsBreakdown, evaluateComplaintModifiers } from './rules';

export interface TriageResult {
  priority: PatientPriority;
  score: number;
  reasons: string[];
  isSingleVitalCritical: boolean;
  preparationAdvice: string[];
  disclaimer: string;
}

export const TRIAGE_DISCLAIMER = 'DEMO DECISION SUPPORT ONLY — NOT VALIDATED FOR CLINICAL USE OR MEDICAL DIAGNOSIS';

/**
 * Pure function scoring patient vitals and symptoms.
 * Rules:
 * - score >= 7 OR any single vital scoring 3 -> P1 (Critical)
 * - score 5-6 -> P2 (Emergent)
 * - score 3-4 -> P3 (Urgent)
 * - score 0-2 -> P4 (Non-urgent)
 */
export function calculateTriageScore(
  vitals: Vitals,
  complaint: string = '',
  ageBand: AgeBand = 'ADULT'
): TriageResult {
  const breakdown = scoreVitalsBreakdown(vitals);
  const complaintEval = evaluateComplaintModifiers(complaint, ageBand);

  let rawScore = 0;
  const reasons: string[] = [];
  let isSingleVitalCritical = false;

  for (const item of breakdown) {
    rawScore += item.points;
    if (item.points > 0) {
      reasons.push(`${item.name}: ${item.reason} (+${item.points})`);
    }
    if (item.isHighRisk) {
      isSingleVitalCritical = true;
    }
  }

  // Add complaint reasons and points
  if (complaintEval.bonusPoints > 0) {
    rawScore += complaintEval.bonusPoints;
    for (const r of complaintEval.reasons) {
      reasons.push(`${r} (+${complaintEval.bonusPoints})`);
    }
  }

  let priority: PatientPriority = 'P4';
  if (complaintEval.forcePriority) {
    priority = complaintEval.forcePriority;
  } else if (rawScore >= 7 || isSingleVitalCritical) {
    priority = 'P1';
    if (isSingleVitalCritical && rawScore < 7) {
      reasons.unshift('Direct P1 escalation triggered: Single vital sign in critical red-zone');
    }
  } else if (rawScore >= 5) {
    priority = 'P2';
  } else if (rawScore >= 3) {
    priority = 'P3';
  } else {
    priority = 'P4';
  }

  const preparationAdvice: string[] = [];
  if (priority === 'P1') {
    preparationAdvice.push('Immediate Resuscitation Bay clearance');
    preparationAdvice.push('Trauma / Cardiac code team activation');
    preparationAdvice.push('Airway & Mechanical Ventilator standby');
  } else if (priority === 'P2') {
    preparationAdvice.push('Rapid Assessment Cubicle reservation');
    preparationAdvice.push('Emergency physician bedside arrival < 10 mins');
  } else if (priority === 'P3') {
    preparationAdvice.push('Standard ER bed allocation');
  } else {
    preparationAdvice.push('Fast-track / Ambulatory intake');
  }

  return {
    priority,
    score: rawScore,
    reasons,
    isSingleVitalCritical,
    preparationAdvice,
    disclaimer: TRIAGE_DISCLAIMER,
  };
}
