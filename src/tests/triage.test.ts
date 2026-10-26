import { describe, it, expect } from 'vitest';
import { calculateTriageScore } from '@/engine/triage/score';
import { calculateVitalsTrend } from '@/engine/triage/trend';
import { Vitals } from '@/lib/types';

describe('Triage Scoring Engine', () => {
  it('should score normal vitals as P4 Non-urgent', () => {
    const normalVitals: Vitals = {
      hr: 72,
      sbp: 120,
      dbp: 80,
      spo2: 98,
      rr: 16,
      gcs: 15,
      tempC: 36.8,
      ts: Date.now(),
    };

    const result = calculateTriageScore(normalVitals, 'Mild sprain', 'ADULT');
    expect(result.priority).toBe('P4');
    expect(result.score).toBeLessThanOrEqual(2);
    expect(result.disclaimer).toBeTruthy();
  });

  it('should immediately escalate to P1 when SpO2 <= 91% (single critical vital rule)', () => {
    const hypoxicVitals: Vitals = {
      hr: 80,
      sbp: 120,
      dbp: 80,
      spo2: 90, // <= 91 triggers 3 pts
      rr: 18,
      gcs: 15,
      tempC: 37.0,
      ts: Date.now(),
    };

    const result = calculateTriageScore(hypoxicVitals, 'Dyspnea', 'ADULT');
    expect(result.priority).toBe('P1');
    expect(result.isSingleVitalCritical).toBe(true);
    expect(result.reasons.some((r) => r.includes('SpO2') || r.includes('hypoxia'))).toBe(true);
  });

  it('should identify acute STEMI red flag in chief complaint and provide explainability reasons', () => {
    const cardiacVitals: Vitals = {
      hr: 115,
      sbp: 88,
      dbp: 58,
      spo2: 92,
      rr: 24,
      gcs: 14,
      tempC: 36.8,
      ts: Date.now(),
    };

    const result = calculateTriageScore(cardiacVitals, 'Crushing substernal chest pain radiating to arm', 'ADULT');
    expect(result.priority).toBe('P1');
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.preparationAdvice.some((a) => a.includes('Resuscitation'))).toBe(true);
  });

  it('should detect DETERIORATING trend across worsening sequential vitals', () => {
    const v1: Vitals = { hr: 80, sbp: 120, dbp: 80, spo2: 97, rr: 16, gcs: 15, tempC: 37.0, ts: 1000 };
    const v2: Vitals = { hr: 110, sbp: 100, dbp: 65, spo2: 93, rr: 22, gcs: 14, tempC: 37.2, ts: 2000 };
    const v3: Vitals = { hr: 128, sbp: 86, dbp: 50, spo2: 90, rr: 28, gcs: 12, tempC: 36.4, ts: 3000 };

    const trend = calculateVitalsTrend([v1, v2, v3]);
    expect(trend.trend).toBe('DETERIORATING');
    expect(trend.scoreDelta).toBeGreaterThan(0);
  });
});
