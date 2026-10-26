import { CaseType, Priority, Vitals } from '@/lib/types';

export interface PriorityEvaluation {
  priority: Priority;
  priorityReasons: string[];
  reasons: string[];
  score: number;
  disclaimer: string;
}

export const PRIORITY_THRESHOLDS = {
  critical: {
    spo2Max: 89, // < 90
    sbpMax: 89, // < 90
    gcsMax: 8, // <= 8
    hrMin: 131, // > 130
    hrMax: 39, // < 40
  },
  urgent: {
    spo2Min: 90,
    spo2Max: 93,
    sbpMin: 90,
    sbpMax: 100,
    gcsMin: 9,
    gcsMax: 13,
    hrHighMin: 111,
    hrHighMax: 130,
    hrLowMin: 40,
    hrLowMax: 50,
  },
};

export const CLINICAL_DISCLAIMER = 'Demo decision-support only, not medical advice.';

/**
 * Evaluates patient priority from quick vitals and case type per architecture.md §8:
 * Evaluated from most severe to least (CRITICAL -> URGENT -> STABLE)
 */
export function evaluatePatientPriority(
  vitals: Partial<Vitals>,
  caseType: CaseType = 'OTHER'
): PriorityEvaluation {
  const reasons: string[] = [];
  const priorityReasons: string[] = [];

  const hr = vitals.hr;
  const sbp = vitals.sbp;
  const spo2 = vitals.spo2;
  const gcs = vitals.gcs;

  let isCritical = false;
  let isUrgent = false;

  // 1. Check CRITICAL criteria
  if (spo2 !== undefined && spo2 < 90) {
    isCritical = true;
    priorityReasons.push(`SpO₂ ${spo2}% (< 90% severe hypoxia)`);
  }
  if (sbp !== undefined && sbp < 90) {
    isCritical = true;
    priorityReasons.push(`Systolic BP ${sbp} mmHg (< 90 shock threshold)`);
  }
  if (gcs !== undefined && gcs <= 8) {
    isCritical = true;
    priorityReasons.push(`GCS ${gcs} (≤ 8 severe coma / airway compromise)`);
  }
  if (hr !== undefined && (hr > 130 || hr < 40)) {
    isCritical = true;
    priorityReasons.push(`Heart Rate ${hr} bpm (${hr > 130 ? '> 130 extreme tachycardia' : '< 40 severe bradycardia'})`);
  }

  // 2. Check URGENT criteria if not already critical
  if (!isCritical) {
    if (spo2 !== undefined && spo2 >= 90 && spo2 <= 93) {
      isUrgent = true;
      priorityReasons.push(`SpO₂ ${spo2}% (90-93% borderline hypoxia)`);
    }
    if (sbp !== undefined && sbp >= 90 && sbp <= 100) {
      isUrgent = true;
      priorityReasons.push(`Systolic BP ${sbp} mmHg (90-100 borderline hypotension)`);
    }
    if (gcs !== undefined && gcs >= 9 && gcs <= 13) {
      isUrgent = true;
      priorityReasons.push(`GCS ${gcs} (9-13 moderate alteration of consciousness)`);
    }
    if (hr !== undefined && ((hr >= 111 && hr <= 130) || (hr >= 40 && hr <= 50))) {
      isUrgent = true;
      priorityReasons.push(`Heart Rate ${hr} bpm (abnormal range)`);
    }
  }

  let finalPriority: Priority = 'STABLE';
  let score = 0;

  if (isCritical) {
    finalPriority = 'CRITICAL';
    score = 8;
  } else if (isUrgent) {
    finalPriority = 'URGENT';
    score = 5;
  } else {
    finalPriority = 'STABLE';
    score = 1;
    priorityReasons.push('All recorded vitals within standard acceptable limits');
  }

  // 3. Case type escalation: stroke or cardiac with any abnormal vital raises priority by one level
  const isHighRiskCase = caseType === 'CARDIAC' || caseType === 'STROKE' || caseType === 'TRAUMA';
  if (isHighRiskCase && finalPriority === 'STABLE' && (hr !== undefined || sbp !== undefined || spo2 !== undefined)) {
    // If patient has mild vital signs or high-risk complaint
    if ((spo2 !== undefined && spo2 <= 95) || (sbp !== undefined && sbp >= 160) || (hr !== undefined && hr >= 100)) {
      finalPriority = 'URGENT';
      priorityReasons.push(`High-risk ${caseType.toLowerCase()} presentation upgraded to Urgent`);
    }
  } else if (isHighRiskCase && finalPriority === 'URGENT' && isUrgent) {
    // If already urgent with critical case risk
    if (caseType === 'CARDIAC' && sbp !== undefined && sbp <= 95) {
      finalPriority = 'CRITICAL';
      priorityReasons.push(`Acute STEMI shock risk escalated to Critical`);
    }
  }

  reasons.push(...priorityReasons);

  return {
    priority: finalPriority,
    priorityReasons,
    reasons,
    score,
    disclaimer: CLINICAL_DISCLAIMER,
  };
}

/**
 * Formats a short rule-based explainability headline for the cockpit priority banner.
 * Example: "CRITICAL: SpO2 88% (below 90), GCS 12"
 */
export function formatPriorityHeadline(
  vitals: Partial<Vitals>,
  priority: Priority = 'STABLE',
  caseType: CaseType = 'OTHER'
): string {
  const parts: string[] = [];

  if (vitals.spo2 !== undefined && vitals.spo2 < 90) {
    parts.push(`SpO2 ${vitals.spo2}% (below 90)`);
  } else if (vitals.spo2 !== undefined && vitals.spo2 <= 93) {
    parts.push(`SpO2 ${vitals.spo2}% (low)`);
  }

  if (vitals.sbp !== undefined && vitals.sbp < 90) {
    parts.push(`BP ${vitals.sbp} mmHg (< 90)`);
  } else if (vitals.sbp !== undefined && vitals.sbp <= 100) {
    parts.push(`BP ${vitals.sbp} mmHg`);
  }

  if (vitals.gcs !== undefined && vitals.gcs <= 8) {
    parts.push(`GCS ${vitals.gcs} (severe)`);
  } else if (vitals.gcs !== undefined && vitals.gcs <= 13) {
    parts.push(`GCS ${vitals.gcs}`);
  }

  if (vitals.hr !== undefined && (vitals.hr > 130 || vitals.hr < 40)) {
    parts.push(`HR ${vitals.hr} bpm`);
  } else if (vitals.hr !== undefined && (vitals.hr > 110 || vitals.hr < 50)) {
    parts.push(`HR ${vitals.hr}`);
  }

  if (parts.length === 0) {
    if (caseType !== 'OTHER') {
      return `${priority}: ${caseType} protocol active, vitals stable`;
    }
    return `${priority}: Vitals within acceptable parameters`;
  }

  return `${priority}: ${parts.join(', ')}`;
}

