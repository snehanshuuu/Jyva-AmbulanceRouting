import { describe, it, expect } from 'vitest';
import { rankHospitals } from '@/engine/recommend/rank';
import { Hospital, LatLng } from '@/lib/types';

describe('Hospital Recommendation Engine', () => {
  const testHospitals: Hospital[] = [
    {
      id: 'hosp-cardiac',
      name: 'Cardiac Center',
      pos: { lat: 19.01, lng: 72.84 },
      address: 'Parel',
      phone: '123',
      specialties: ['CARDIAC', 'TRAUMA'],
      capacity: { erBeds: 5, erBedsTotal: 20, icuBeds: 4, icuBedsTotal: 10, ventilators: 2, ventilatorsTotal: 5 },
      erLoad: 0.5,
      diverted: false,
    },
    {
      id: 'hosp-general',
      name: 'General Clinic',
      pos: { lat: 19.011, lng: 72.841 }, // closer
      address: 'Dadar',
      phone: '456',
      specialties: ['GENERAL'],
      capacity: { erBeds: 2, erBedsTotal: 10, icuBeds: 0, icuBedsTotal: 2, ventilators: 0, ventilatorsTotal: 2 },
      erLoad: 0.8,
      diverted: false,
    },
    {
      id: 'hosp-diverted',
      name: 'Overloaded Hospital',
      pos: { lat: 19.009, lng: 72.839 },
      address: 'Byculla',
      phone: '789',
      specialties: ['CARDIAC'],
      capacity: { erBeds: 0, erBedsTotal: 15, icuBeds: 0, icuBedsTotal: 8, ventilators: 0, ventilatorsTotal: 4 },
      erLoad: 1.0,
      diverted: true,
      divertReason: 'Full',
    },
  ];

  const origin: LatLng = { lat: 19.01, lng: 72.84 };

  it('should mark diverted hospitals as ineligible for primary recommendation', () => {
    const results = rankHospitals(testHospitals, origin, { caseType: 'CARDIAC', priority: 'CRITICAL' });
    const divertedResult = results.find((r) => r.hospital.id === 'hosp-diverted');
    expect(divertedResult?.isEligible).toBe(false);
    expect(divertedResult?.ineligibleReason).toMatch(/Diverted/i);

    // Recommended hospital must be eligible
    const recommended = results.find((r) => r.isRecommended);
    expect(recommended).toBeDefined();
    expect(recommended?.isEligible).toBe(true);
    expect(recommended?.hospital.id).not.toBe('hosp-diverted');
  });

  it('should prioritize specialty match for cardiac emergencies', () => {
    const results = rankHospitals(testHospitals, origin, { caseType: 'CARDIAC', priority: 'CRITICAL' });
    expect(results[0].hospital.id).toBe('hosp-cardiac');
    expect(results[0].isEligible).toBe(true);
    expect(results[0].reason).toContain('cardiac');
  });
});
