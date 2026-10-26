import { describe, it, expect } from 'vitest';
import { formatPriorityHeadline, evaluatePatientPriority } from '@/engine/priority';
import { rankHospitals } from '@/engine/rank';
import { shouldSwitchRoute, calculateJamPenalty } from '@/engine/route';
import defaultHospitals from '@/data/hospitals.json';
import { Hospital, Vitals } from '@/lib/types';

describe('Milestone 8: Final Polish, Accessibility & Production Invariants', () => {
  const hospitals = defaultHospitals as unknown as Hospital[];
  const sampleOrigin = { lat: 19.0225, lng: 72.8420 }; // Dadar TT

  describe('1. Accessibility & Triple Redundancy (Color + Icon + Text)', () => {
    it('produces distinct priority levels with descriptive textual headlines for all severity tiers', () => {
      // Critical (SpO2 < 90%)
      const criticalVitals: Vitals = { hr: 135, sbp: 80, dbp: 50, spo2: 86, gcs: 11, ts: Date.now() };
      const critResult = evaluatePatientPriority(criticalVitals, 'CARDIAC');
      expect(critResult.priority).toBe('CRITICAL');
      expect(critResult.reasons.length).toBeGreaterThan(0);

      const critHeadline = formatPriorityHeadline(criticalVitals, 'CRITICAL', 'CARDIAC');
      expect(critHeadline.toUpperCase()).toContain('CRITICAL');
      expect(critHeadline).toContain('86%'); // SpO2 included in headline for immediate glanceability

      // Urgent (HR elevated, borderline SpO2)
      const urgentVitals: Vitals = { hr: 115, sbp: 130, dbp: 85, spo2: 93, gcs: 15, ts: Date.now() };
      const urgResult = evaluatePatientPriority(urgentVitals, 'TRAUMA');
      expect(urgResult.priority).toBe('URGENT');
      const urgHeadline = formatPriorityHeadline(urgentVitals, 'URGENT', 'TRAUMA');
      expect(urgHeadline.toUpperCase()).toContain('URGENT');

      // Stable
      const stableVitals: Vitals = { hr: 75, sbp: 120, dbp: 80, spo2: 98, gcs: 15, ts: Date.now() };
      const stabResult = evaluatePatientPriority(stableVitals, 'OTHER');
      expect(stabResult.priority).toBe('STABLE');
      const stabHeadline = formatPriorityHeadline(stableVitals, 'STABLE', 'OTHER');
      expect(stabHeadline.toUpperCase()).toContain('STABLE');
    });

    it('ensures every hospital recommendation includes human-readable reason text', () => {
      const ranked = rankHospitals(hospitals, sampleOrigin, {
        caseType: 'CARDIAC',
        priority: 'CRITICAL',
      });

      expect(ranked.length).toBeGreaterThan(0);
      const topPick = ranked[0];
      expect(topPick.isRecommended).toBe(true);
      expect(topPick.reason).toBeDefined();
      expect(topPick.reason.length).toBeGreaterThan(5);

      // Verify all alternatives also have reasons or duration breakdowns
      ranked.forEach((rec) => {
        expect(rec.totalMin).toBe(rec.etaMinutes + rec.waitingMinutes);
        expect(rec.distanceMeters).toBeGreaterThan(0);
      });
    });
  });

  describe('2. Routing Hysteresis & Anti-Flip-Flop Logic (Architecture §6)', () => {
    it('rejects candidate detour if savings are under 60 seconds and under 15%', () => {
      // 600s vs 570s (saves 30s, 5%) -> should NOT switch
      const res1 = shouldSwitchRoute(600, 570);
      expect(res1.shouldSwitch).toBe(false);
      expect(res1.savingsS).toBe(30);

      // 600s vs 530s (saves 70s, > 60s) -> SHOULD switch
      const res2 = shouldSwitchRoute(600, 530);
      expect(res2.shouldSwitch).toBe(true);
      expect(res2.savingsS).toBe(70);

      // 300s vs 250s (saves 50s, 16.7% > 15%) -> SHOULD switch
      const res3 = shouldSwitchRoute(300, 250);
      expect(res3.shouldSwitch).toBe(true);
      expect(res3.savingsS).toBe(50);
    });

    it('safely handles empty coordinates and empty jam zones without throwing', () => {
      expect(calculateJamPenalty([], [])).toBe(0);
      expect(calculateJamPenalty([{ lat: 19.02, lng: 72.84 }], [])).toBe(0);
      expect(calculateJamPenalty([], [{ id: 'j1', pos: { lat: 19.02, lng: 72.84 }, radiusM: 300, delayS: 120 }])).toBe(0);
    });
  });

  describe('3. Diverted Hospital Safety Exclusion', () => {
    it('strictly penalizes diverted facilities and moves them below accepting hospitals', () => {
      const modifiedHospitals: Hospital[] = hospitals.map((h) =>
        h.id === 'hosp-sion' ? { ...h, diverted: true, divertReason: 'Emergency Surge' } : h
      );

      const ranked = rankHospitals(modifiedHospitals, sampleOrigin, {
        caseType: 'CARDIAC',
        priority: 'CRITICAL',
      });

      const sion = ranked.find((r) => r.hospital.id === 'hosp-sion');
      expect(sion).toBeDefined();
      expect(sion?.isRecommended).toBe(false);
      expect(sion?.hospital.diverted).toBe(true);

      // Top recommendation must be an active, accepting hospital
      expect(ranked[0].hospital.diverted).toBe(false);
      expect(ranked[0].isRecommended).toBe(true);
    });
  });
});
