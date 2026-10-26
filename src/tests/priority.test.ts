import { describe, it, expect } from 'vitest';
import { evaluatePatientPriority, CLINICAL_DISCLAIMER, formatPriorityHeadline } from '@/engine/priority';

describe('Patient Priority Engine (Architecture §8 & §12)', () => {
  it('identifies STABLE priority when all vitals are normal', () => {
    const result = evaluatePatientPriority(
      { hr: 72, sbp: 120, dbp: 80, spo2: 98, gcs: 15 },
      'OTHER'
    );
    expect(result.priority).toBe('STABLE');
    expect(result.disclaimer).toBe(CLINICAL_DISCLAIMER);
    expect(result.priorityReasons.length).toBeGreaterThan(0);
  });

  describe('CRITICAL threshold boundaries', () => {
    it('triggers CRITICAL when SpO2 < 90', () => {
      const result89 = evaluatePatientPriority({ spo2: 89 });
      expect(result89.priority).toBe('CRITICAL');
      expect(result89.priorityReasons.some((r) => r.includes('SpO₂ 89%'))).toBe(true);

      const result90 = evaluatePatientPriority({ spo2: 90 });
      expect(result90.priority).not.toBe('CRITICAL'); // 90 is URGENT
    });

    it('triggers CRITICAL when systolic BP < 90', () => {
      const result89 = evaluatePatientPriority({ sbp: 89 });
      expect(result89.priority).toBe('CRITICAL');
      expect(result89.priorityReasons.some((r) => r.includes('Systolic BP 89'))).toBe(true);

      const result90 = evaluatePatientPriority({ sbp: 90 });
      expect(result90.priority).not.toBe('CRITICAL');
    });

    it('triggers CRITICAL when GCS <= 8', () => {
      const result8 = evaluatePatientPriority({ gcs: 8 });
      expect(result8.priority).toBe('CRITICAL');
      expect(result8.priorityReasons.some((r) => r.includes('GCS 8'))).toBe(true);

      const result9 = evaluatePatientPriority({ gcs: 9 });
      expect(result9.priority).toBe('URGENT');
    });

    it('triggers CRITICAL when HR > 130 or < 40', () => {
      const highHr = evaluatePatientPriority({ hr: 131 });
      expect(highHr.priority).toBe('CRITICAL');
      expect(highHr.priorityReasons.some((r) => r.includes('131'))).toBe(true);

      const lowHr = evaluatePatientPriority({ hr: 39 });
      expect(lowHr.priority).toBe('CRITICAL');
      expect(lowHr.priorityReasons.some((r) => r.includes('39'))).toBe(true);
    });
  });

  describe('URGENT threshold boundaries', () => {
    it('triggers URGENT for SpO2 between 90 and 93', () => {
      expect(evaluatePatientPriority({ spo2: 90 }).priority).toBe('URGENT');
      expect(evaluatePatientPriority({ spo2: 93 }).priority).toBe('URGENT');
      expect(evaluatePatientPriority({ spo2: 94 }).priority).toBe('STABLE');
    });

    it('triggers URGENT for systolic BP between 90 and 100', () => {
      expect(evaluatePatientPriority({ sbp: 90 }).priority).toBe('URGENT');
      expect(evaluatePatientPriority({ sbp: 100 }).priority).toBe('URGENT');
      expect(evaluatePatientPriority({ sbp: 110 }).priority).toBe('STABLE');
    });

    it('triggers URGENT for GCS between 9 and 13', () => {
      expect(evaluatePatientPriority({ gcs: 9 }).priority).toBe('URGENT');
      expect(evaluatePatientPriority({ gcs: 13 }).priority).toBe('URGENT');
      expect(evaluatePatientPriority({ gcs: 14 }).priority).toBe('STABLE');
    });

    it('triggers URGENT for HR in 111-130 or 40-50 bpm ranges', () => {
      expect(evaluatePatientPriority({ hr: 111 }).priority).toBe('URGENT');
      expect(evaluatePatientPriority({ hr: 130 }).priority).toBe('URGENT');
      expect(evaluatePatientPriority({ hr: 40 }).priority).toBe('URGENT');
      expect(evaluatePatientPriority({ hr: 50 }).priority).toBe('URGENT');
      expect(evaluatePatientPriority({ hr: 75 }).priority).toBe('STABLE');
    });
  });

  describe('Case-type bump and clinical disclaimer', () => {
    it('bumps STABLE priority to URGENT for cardiac presentation with borderline vital', () => {
      const normalCardiac = evaluatePatientPriority({ hr: 102, sbp: 130, spo2: 97 }, 'CARDIAC');
      expect(normalCardiac.priority).toBe('URGENT');
      expect(normalCardiac.priorityReasons.some((r) => r.includes('cardiac'))).toBe(true);
    });

    it('bumps URGENT priority to CRITICAL for cardiac presentation with low borderline BP', () => {
      const urgentCardiac = evaluatePatientPriority({ sbp: 92, spo2: 94 }, 'CARDIAC');
      expect(urgentCardiac.priority).toBe('CRITICAL');
      expect(urgentCardiac.priorityReasons.some((r) => r.includes('STEMI shock risk'))).toBe(true);
    });

    it('always includes mandatory clinical disclaimer', () => {
      const evaluation = evaluatePatientPriority({ hr: 120 }, 'STROKE');
      expect(evaluation.disclaimer).toBe('Demo decision-support only, not medical advice.');
    });
  });

  describe('formatPriorityHeadline helper', () => {
    it('formats explainable headline matching Stitch design', () => {
      const headline = formatPriorityHeadline({ spo2: 88, gcs: 12 }, 'CRITICAL');
      expect(headline).toBe('CRITICAL: SpO2 88% (below 90), GCS 12');
    });

    it('formats stable headline when all vitals within normal range', () => {
      const headline = formatPriorityHeadline({ spo2: 98, hr: 75 }, 'STABLE');
      expect(headline).toBe('STABLE: Vitals within acceptable parameters');
    });
  });
});
