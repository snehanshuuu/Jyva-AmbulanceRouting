import { describe, it, expect } from 'vitest';
import { rankHospitals, checkHospitalAlertWarning } from '@/engine/rank';
import { Hospital, LatLng } from '@/lib/types';

describe('Hospital Ranking Engine (Architecture §7)', () => {
  const origin: LatLng = { lat: 19.01, lng: 72.84 };

  const testHospitals: Hospital[] = [
    {
      id: 'hosp-kem',
      name: 'KEM Hospital',
      pos: { lat: 19.015, lng: 72.845 },
      address: 'Parel',
      phone: '111',
      specialties: ['CARDIAC', 'TRAUMA', 'GENERAL'],
      waitingMin: 15,
      freeErBeds: 4,
      freeIcuBeds: 2,
      diverted: false,
    },
    {
      id: 'hosp-hinduja',
      name: 'Hinduja Hospital',
      pos: { lat: 19.025, lng: 72.840 },
      address: 'Mahim',
      phone: '222',
      specialties: ['CARDIAC', 'GENERAL'],
      waitingMin: 5,
      freeErBeds: 6,
      freeIcuBeds: 3,
      diverted: false,
    },
    {
      id: 'hosp-sion',
      name: 'Sion Hospital',
      pos: { lat: 19.035, lng: 72.855 },
      address: 'Sion',
      phone: '333',
      specialties: ['TRAUMA', 'GENERAL'],
      waitingMin: 45,
      freeErBeds: 0,
      freeIcuBeds: 0,
      diverted: false,
    },
    {
      id: 'hosp-diverted',
      name: 'Diverted Trauma Center',
      pos: { lat: 19.012, lng: 72.841 },
      address: 'Dadar',
      phone: '444',
      specialties: ['TRAUMA', 'CARDIAC'],
      waitingMin: 10,
      freeErBeds: 5,
      freeIcuBeds: 2,
      diverted: true,
      divertReason: 'Power failure in triage wing',
    },
  ];

  it('orders eligible hospitals by totalMin (etaMin + waitingMin) ascending', () => {
    // Custom ETAs: KEM = 10 min (total = 10+15 = 25), Hinduja = 12 min (total = 12+5 = 17)
    const customEtas = new Map<string, number>([
      ['hosp-kem', 600],
      ['hosp-hinduja', 720],
      ['hosp-sion', 900],
    ]);

    const ranked = rankHospitals(testHospitals, origin, {
      caseType: 'CARDIAC',
      priority: 'URGENT',
      customEtas,
    });

    // Hinduja has shorter totalMin (17 vs 25), so it should rank #1
    expect(ranked[0].hospital.id).toBe('hosp-hinduja');
    expect(ranked[0].totalMin).toBe(17);
    expect(ranked[0].isRecommended).toBe(true);

    expect(ranked[1].hospital.id).toBe('hosp-kem');
    expect(ranked[1].totalMin).toBe(25);
  });

  it('excludes diverted hospitals from top recommendations and marks them ineligible', () => {
    const ranked = rankHospitals(testHospitals, origin, {
      caseType: 'TRAUMA',
      priority: 'CRITICAL',
    });

    const diverted = ranked.find((r) => r.hospital.id === 'hosp-diverted');
    expect(diverted).toBeDefined();
    expect(diverted?.isEligible).toBe(false);
    expect(diverted?.isRecommended).toBe(false);
    expect(diverted?.ineligibleReason).toMatch(/Power failure/);
  });

  it('filters by specialty requirement unless caseType is OTHER', () => {
    // Sion does not have CARDIAC
    const cardiacRanked = rankHospitals(testHospitals, origin, {
      caseType: 'CARDIAC',
      priority: 'STABLE',
    });
    const sionCardiac = cardiacRanked.find((r) => r.hospital.id === 'hosp-sion');
    expect(sionCardiac?.isEligible).toBe(false);
    expect(sionCardiac?.ineligibleReason).toMatch(/CARDIAC/i);

    // With OTHER caseType, all non-diverted hospitals with beds are eligible
    const otherRanked = rankHospitals(testHospitals, origin, {
      caseType: 'OTHER',
      priority: 'STABLE',
    });
    const sionOther = otherRanked.find((r) => r.hospital.id === 'hosp-sion');
    expect(sionOther?.isEligible).toBe(true);
  });

  it('requires freeErBeds > 0 for CRITICAL and URGENT patients', () => {
    // Sion has 0 free ER beds
    const urgentRanked = rankHospitals(testHospitals, origin, {
      caseType: 'TRAUMA',
      priority: 'URGENT',
    });
    const sionUrgent = urgentRanked.find((r) => r.hospital.id === 'hosp-sion');
    expect(sionUrgent?.isEligible).toBe(false);
    expect(sionUrgent?.ineligibleReason).toMatch(/Zero ER beds/i);

    // STABLE patients do not strictly require free immediate ER resuscitation beds
    const stableRanked = rankHospitals(testHospitals, origin, {
      caseType: 'TRAUMA',
      priority: 'STABLE',
    });
    const sionStable = stableRanked.find((r) => r.hospital.id === 'hosp-sion');
    expect(sionStable?.isEligible).toBe(true);
  });

  it('breaks ties in totalMin with shorter transit ETA', () => {
    // Create two hospitals with identical totalMin = 20 min
    // H1: ETA 15 + Wait 5 = 20
    // H2: ETA 10 + Wait 10 = 20 (H2 has shorter ETA and should win)
    const tieHospitals: Hospital[] = [
      {
        id: 'hosp-a',
        name: 'Hospital A',
        pos: { lat: 19.01, lng: 72.84 },
        address: 'A',
        phone: '1',
        specialties: ['GENERAL'],
        waitingMin: 5,
        freeErBeds: 2,
        freeIcuBeds: 1,
        diverted: false,
      },
      {
        id: 'hosp-b',
        name: 'Hospital B',
        pos: { lat: 19.01, lng: 72.84 },
        address: 'B',
        phone: '2',
        specialties: ['GENERAL'],
        waitingMin: 10,
        freeErBeds: 2,
        freeIcuBeds: 1,
        diverted: false,
      },
    ];

    const customEtas = new Map<string, number>([
      ['hosp-a', 15 * 60], // ETA 15m
      ['hosp-b', 10 * 60], // ETA 10m
    ]);

    const ranked = rankHospitals(tieHospitals, origin, { customEtas });
    expect(ranked[0].totalMin).toBe(20);
    expect(ranked[1].totalMin).toBe(20);
    expect(ranked[0].hospital.id).toBe('hosp-b'); // Shorter ETA wins tie-break
  });

  it('provides warning and next-best hospital when selected hospital becomes diverted or has high wait', () => {
    const ranked = rankHospitals(testHospitals, origin, { caseType: 'OTHER' });
    const warning = checkHospitalAlertWarning('hosp-diverted', ranked);
    expect(warning.hasWarning).toBe(true);
    expect(warning.warningMessage).toMatch(/ER DIVERT/);
    expect(warning.suggestedHospital).toBeDefined();
    expect(warning.suggestedHospital?.id).not.toBe('hosp-diverted');
  });
});
