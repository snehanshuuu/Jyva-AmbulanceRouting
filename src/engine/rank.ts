import { CaseType, Hospital, HospitalRecommendation, LatLng, Priority } from '@/lib/types';
import { haversineDistanceM } from '@/lib/geo';
import { getHospitalRouteEtaSec } from './route';

export interface RankHospitalsOptions {
  caseType?: CaseType;
  priority?: Priority;
  customEtas?: Map<string, number>; // Map of hospitalId -> ETA in seconds (if known from route service)
}

/**
 * Pure function that ranks nearby hospitals per architecture.md §7:
 * totalMin = etaMin + waitingMin
 * eligible = !diverted
 *         && (caseType === 'OTHER' || specialties.includes(caseType))
 *         && (priority === 'STABLE' || freeErBeds > 0)
 * rank     = eligible hospitals sorted by totalMin ascending (ties broken by shorter ETA)
 */
export function rankHospitals(
  hospitals: Hospital[],
  origin: LatLng,
  options: RankHospitalsOptions = {}
): HospitalRecommendation[] {
  const caseType = options.caseType || 'OTHER';
  const priority = options.priority || 'URGENT';
  const customEtas = options.customEtas;

  // Approximate transit speed: 40 km/h in urban congestion
  const AVG_SPEED_MS = (40 * 1000) / 3600;

  const evaluated = hospitals.map((h) => {
    const distM = haversineDistanceM(origin, h.pos);
    const routerEta = getHospitalRouteEtaSec(h.id);
    const etaSec = customEtas?.get(h.id) ?? routerEta ?? Math.max(60, distM / AVG_SPEED_MS);
    const etaMin = Math.max(1, Math.round(etaSec / 60));
    const waitingMin = Math.max(0, h.waitingMin ?? 0);
    const freeErBeds = h.freeErBeds ?? h.capacity?.erBeds ?? 0;
    const totalMin = etaMin + waitingMin;

    // Specialty eligibility per architecture §7: specialties.includes(caseType) (skipped for OTHER)
    const matchesSpecialty =
      caseType === 'OTHER' ||
      h.specialties.includes(caseType);

    // Capacity eligibility
    const hasRequiredBeds = priority === 'STABLE' || freeErBeds > 0;

    let isEligible = true;
    let ineligibleReason: string | undefined;
    let shortReason: string | undefined;

    if (h.diverted) {
      isEligible = false;
      shortReason = 'Not accepting';
      ineligibleReason = h.divertReason ? `Diverted: ${h.divertReason}` : 'Hospital ER currently diverted / closed';
    } else if (!matchesSpecialty) {
      isEligible = false;
      const spec = caseType.toLowerCase();
      shortReason = `No ${spec} unit`;
      ineligibleReason = `No dedicated ${caseType} unit available`;
    } else if (!hasRequiredBeds) {
      isEligible = false;
      shortReason = (h.waitingMin ?? 0) >= 15 || (h.erLoad ?? 0) >= 0.7 ? 'High load' : 'No ER beds';
      ineligibleReason = 'Zero ER beds available for emergency intake';
    }

    const specialtyLabel = caseType !== 'OTHER' && h.specialties.includes(caseType)
      ? `${caseType.toLowerCase()} unit available`
      : 'ER intake available';

    const reason = `${etaMin} min away + ${waitingMin} min wait = ${totalMin} min, ${specialtyLabel}`;

    const reasonsList: string[] = [
      `Transit: ${etaMin} min (${(distM / 1000).toFixed(1)} km)`,
      `Waiting time: ${waitingMin} min`,
      `Capacity: ${freeErBeds} free ER beds, ${h.freeIcuBeds ?? h.capacity?.icuBeds ?? 0} ICU beds`,
    ];

    if (h.diverted) {
      reasonsList.unshift(`⚠️ Diverted: ${h.divertReason || 'Intake closed'}`);
    }

    return {
      hospital: h,
      rank: 0,
      totalMin,
      etaMinutes: etaMin,
      waitingMinutes: waitingMin,
      distanceMeters: Math.round(distM),
      isRecommended: false,
      reason,
      reasons: reasonsList,
      isEligible,
      ineligibleReason,
      shortReason,
    };
  });

  // Sort: Eligible hospitals first sorted by totalMin ascending, then shorter ETA.
  // Ineligible hospitals placed at the bottom.
  evaluated.sort((a, b) => {
    if (a.isEligible && !b.isEligible) return -1;
    if (!a.isEligible && b.isEligible) return 1;
    if (a.totalMin !== b.totalMin) return a.totalMin - b.totalMin;
    return a.etaMinutes - b.etaMinutes;
  });

  // Assign ranks & mark top eligible as Recommended
  let eligibleCount = 0;
  evaluated.forEach((item, index) => {
    item.rank = index + 1;
    if (item.isEligible && eligibleCount === 0) {
      item.isRecommended = true;
      eligibleCount++;
    }
  });

  return evaluated;
}

/**
 * Returns a warning message and suggests the next-best hospital if the current
 * destination hospital becomes diverted or has an excessive wait spike.
 */
export function checkHospitalAlertWarning(
  selectedHospitalId: string,
  rankedHospitals: HospitalRecommendation[]
): { hasWarning: boolean; warningMessage?: string; suggestedHospital?: Hospital } {
  const current = rankedHospitals.find((r) => r.hospital.id === selectedHospitalId);
  if (!current) {
    return { hasWarning: false };
  }

  const nextBest = rankedHospitals.find((r) => r.isEligible && r.hospital.id !== selectedHospitalId);

  if (current.hospital.diverted) {
    return {
      hasWarning: true,
      warningMessage: `${current.hospital.name} has declared ER DIVERT. Reroute recommended.`,
      suggestedHospital: nextBest?.hospital,
    };
  }

  if (current.waitingMinutes >= 30) {
    return {
      hasWarning: true,
      warningMessage: `High waiting time alert at ${current.hospital.name} (${current.waitingMinutes} min wait).`,
      suggestedHospital: nextBest?.hospital,
    };
  }

  return { hasWarning: false };
}
