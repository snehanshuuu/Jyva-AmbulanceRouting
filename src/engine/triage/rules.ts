import { Vitals, PatientPriority, AgeBand } from '@/lib/types';

export interface VitalScoreItem {
  name: string;
  value: number;
  points: number;
  reason: string;
  isHighRisk: boolean; // 3 points
}

/**
 * Evaluates individual vital signs based on NEWS2-inspired demonstration rules.
 * All functions are pure with zero React imports.
 */
export function scoreVitalsBreakdown(vitals: Vitals): VitalScoreItem[] {
  const items: VitalScoreItem[] = [];

  // 1. Respiratory Rate
  let rrPts = 0;
  let rrReason = vitals.rr !== undefined ? `RR normal (${vitals.rr}/min)` : 'RR not recorded';
  if (vitals.rr !== undefined) {
    if (vitals.rr <= 8 || vitals.rr >= 25) {
      rrPts = 3;
      rrReason = `Critical RR ${vitals.rr}/min (≤8 or ≥25)`;
    } else if (vitals.rr >= 21 || (vitals.rr >= 9 && vitals.rr <= 11)) {
      rrPts = 1;
      rrReason = `Abnormal RR ${vitals.rr}/min (9-11 or 21-24)`;
    }
  }
  items.push({ name: 'Respiratory Rate', value: vitals.rr ?? 16, points: rrPts, reason: rrReason, isHighRisk: rrPts === 3 });

  // 2. Oxygen Saturation (SpO2)
  let spo2Pts = 0;
  let spo2Reason = `SpO₂ normal (${vitals.spo2}%)`;
  if (vitals.spo2 <= 91) {
    spo2Pts = 3;
    spo2Reason = `Critical hypoxia SpO₂ ${vitals.spo2}% (≤91%)`;
  } else if (vitals.spo2 <= 93) {
    spo2Pts = 2;
    spo2Reason = `Moderate hypoxia SpO₂ ${vitals.spo2}% (92-93%)`;
  } else if (vitals.spo2 <= 95) {
    spo2Pts = 1;
    spo2Reason = `Mild desaturation SpO₂ ${vitals.spo2}% (94-95%)`;
  }
  items.push({ name: 'SpO2', value: vitals.spo2, points: spo2Pts, reason: spo2Reason, isHighRisk: spo2Pts === 3 });

  // 3. Systolic Blood Pressure (SBP)
  let sbpPts = 0;
  let sbpReason = `SBP normal (${vitals.sbp} mmHg)`;
  if (vitals.sbp <= 90 || vitals.sbp >= 220) {
    sbpPts = 3;
    sbpReason = vitals.sbp <= 90 ? `Hypotension / Shock SBP ${vitals.sbp} mmHg (≤90)` : `Hypertensive Crisis SBP ${vitals.sbp} mmHg (≥220)`;
  } else if (vitals.sbp >= 91 && vitals.sbp <= 100) {
    sbpPts = 2;
    sbpReason = `Borderline hypotension SBP ${vitals.sbp} mmHg (91-100)`;
  } else if (vitals.sbp >= 101 && vitals.sbp <= 110) {
    sbpPts = 1;
    sbpReason = `Mild low SBP ${vitals.sbp} mmHg (101-110)`;
  }
  items.push({ name: 'Systolic BP', value: vitals.sbp, points: sbpPts, reason: sbpReason, isHighRisk: sbpPts === 3 });

  // 4. Heart Rate (HR)
  let hrPts = 0;
  let hrReason = `Heart rate normal (${vitals.hr} bpm)`;
  if (vitals.hr <= 40 || vitals.hr >= 131) {
    hrPts = 3;
    hrReason = vitals.hr <= 40 ? `Severe Bradycardia HR ${vitals.hr} bpm (≤40)` : `Severe Tachycardia HR ${vitals.hr} bpm (≥131)`;
  } else if (vitals.hr >= 111 && vitals.hr <= 130) {
    hrPts = 2;
    hrReason = `Moderate tachycardia HR ${vitals.hr} bpm (111-130)`;
  } else if ((vitals.hr >= 41 && vitals.hr <= 50) || (vitals.hr >= 91 && vitals.hr <= 110)) {
    hrPts = 1;
    hrReason = `Borderline HR ${vitals.hr} bpm`;
  }
  items.push({ name: 'Heart Rate', value: vitals.hr, points: hrPts, reason: hrReason, isHighRisk: hrPts === 3 });

  // 5. Glasgow Coma Scale (GCS)
  let gcsPts = 0;
  let gcsReason = `GCS intact (${vitals.gcs}/15)`;
  if (vitals.gcs <= 12) {
    gcsPts = 3;
    gcsReason = `Altered mental status / Coma GCS ${vitals.gcs} (≤12)`;
  } else if (vitals.gcs >= 13 && vitals.gcs <= 14) {
    gcsPts = 2;
    gcsReason = `Mild consciousness impairment GCS ${vitals.gcs} (13-14)`;
  }
  items.push({ name: 'GCS', value: vitals.gcs, points: gcsPts, reason: gcsReason, isHighRisk: gcsPts === 3 });

  // 6. Body Temperature
  let tempPts = 0;
  let tempReason = vitals.tempC !== undefined ? `Temp normal (${vitals.tempC}°C)` : 'Temp not recorded';
  if (vitals.tempC !== undefined) {
    if (vitals.tempC <= 35.0) {
      tempPts = 3;
      tempReason = `Hypothermia ${vitals.tempC}°C (≤35.0)`;
    } else if (vitals.tempC >= 39.1) {
      tempPts = 2;
      tempReason = `High pyrexia ${vitals.tempC}°C (≥39.1)`;
    } else if ((vitals.tempC >= 35.1 && vitals.tempC <= 36.0) || (vitals.tempC >= 38.1 && vitals.tempC <= 39.0)) {
      tempPts = 1;
      tempReason = `Mild temp deviation ${vitals.tempC}°C`;
    }
  }
  items.push({ name: 'Temperature', value: vitals.tempC ?? 37.0, points: tempPts, reason: tempReason, isHighRisk: tempPts === 3 });

  return items;
}

/**
 * Checks for clinical red flags in chief complaints (e.g. STEMI, stroke signs, traumatic hemorrhage).
 */
export function evaluateComplaintModifiers(complaint: string, ageBand: AgeBand): { bonusPoints: number; reasons: string[]; forcePriority?: PatientPriority } {
  const lower = (complaint || '').toLowerCase();
  const reasons: string[] = [];
  let bonusPoints = 0;
  let forcePriority: PatientPriority | undefined;

  if (lower.includes('stemi') || lower.includes('crushing') || (lower.includes('chest pain') && lower.includes('arm'))) {
    reasons.push('Chief complaint indicates high probability acute coronary syndrome / STEMI');
    bonusPoints += 2;
  }

  if (lower.includes('fast') || lower.includes('stroke') || lower.includes('hemiparesis') || lower.includes('slurred')) {
    reasons.push('FAST positive neurological signs indicative of acute stroke');
    bonusPoints += 2;
  }

  if (lower.includes('unconscious') || lower.includes('cardiac arrest') || lower.includes('respiratory arrest')) {
    reasons.push('Immediate life threat: active arrest or profound unresponsiveness');
    forcePriority = 'P1';
  }

  if (ageBand === 'ELDERLY' && (lower.includes('fall') || lower.includes('confusion'))) {
    reasons.push('Elderly patient with high vulnerability mechanism');
    bonusPoints += 1;
  }

  return { bonusPoints, reasons, forcePriority };
}
