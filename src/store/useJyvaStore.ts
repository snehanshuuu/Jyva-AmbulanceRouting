import { create } from 'zustand';
import {
  Ambulance,
  CaseType,
  Hospital,
  HospitalRecommendation,
  LatLng,
  RoutePlan,
  Trip,
  Vitals,
} from '@/lib/types';
import defaultHospitals from '@/data/hospitals.json';
import defaultAmbulances from '@/data/ambulances.json';
import cachedRoutes from '@/data/cachedRoutes.json';
import { rankHospitals } from '@/engine/rank';
import { evaluatePatientPriority } from '@/engine/priority';
import { computeFastestRoute, JamZone } from '@/engine/route';
import { advanceAmbulanceAlongRoute } from '@/engine/sim/movement';
import { sync } from '@/sync/supabaseSync';

export interface JyvaStoreState {
  // State
  hospitals: Hospital[];
  ambulances: Ambulance[];
  activeAmbulanceId: string;
  activeHospitalId: string;
  activeTrip: Trip;
  incomingTrips: Trip[];
  activeRoute: RoutePlan | null;
  jams: JamZone[];
  activeRouteStepIndex: number;
  isSimRunning: boolean;
  simSpeed: number;
  timeSavedS: number;
  rankedHospitals: HospitalRecommendation[];

  // Actions
  setActiveHospitalId: (id: string) => void;
  setActiveAmbulanceId: (id: string) => void;
  setDestinationHospital: (hospitalId: string) => Promise<void>;
  updateHospitalStatus: (
    hospitalId: string,
    updates: { waitingMin?: number; freeErBeds?: number; freeIcuBeds?: number; diverted?: boolean; divertReason?: string }
  ) => void;
  updateVitals: (vitals: Partial<Vitals>, caseType?: CaseType) => void;
  sendAlertToHospital: () => void;
  acknowledgeTrip: (tripId: string) => void;
  markTripReady: (tripId: string) => void;
  addTrafficJam: (jam?: Partial<JamZone>) => Promise<void>;
  clearTrafficJams: () => Promise<void>;
  setIsSimRunning: (running: boolean) => void;
  setSimSpeed: (speed: number) => void;
  resetDemo: () => Promise<void>;
  tick: (deltaSeconds?: number) => void;
  receiveRemoteHospitalUpdate: (hospitals: Hospital[]) => void;
  receiveRemoteTripUpdate: (trip: Trip) => void;
  receiveRemoteReset: () => void;
}

const initialHospitals = (defaultHospitals as unknown as Hospital[]).map((h) => {
  if (h.id === 'hosp-sion') {
    return {
      ...h,
      waitingMin: 3,
      freeErBeds: 6,
      freeIcuBeds: 2,
      capacity: {
        ...(h.capacity || { erBeds: 6, erBedsTotal: 24, icuBeds: 2, icuBedsTotal: 8 }),
        erBeds: 6,
        erBedsTotal: 24,
        icuBeds: 2,
        icuBedsTotal: 8,
      },
      diverted: false,
    };
  }
  return h;
});
const initialAmbulances = defaultAmbulances as unknown as Ambulance[];
const initialActiveAmbulance = initialAmbulances[0];

const initialTrips: Trip[] = [
  {
    id: 'trip-001',
    ambulanceId: 'AMB-014',
    origin: {
      type: 'SCENE',
      label: 'Accident scene, Chembur Flyover',
      pos: { lat: 19.0550, lng: 72.8900 },
    },
    destinationHospitalId: 'hosp-sion',
    caseType: 'CARDIAC',
    vitals: {
      hr: 118,
      sbp: 145,
      dbp: 92,
      spo2: 88,
      gcs: 12,
      ts: Date.now(),
    },
    priority: 'CRITICAL',
    priorityReasons: [
      'SpO₂ 88% (< 90% severe hypoxia criteria)',
      'Tachycardia HR 118 BPM with acute distress',
    ],
    etaSec: 360,
    status: 'PICKED_UP',
    updatedAt: Date.now(),
  },
  {
    id: 'trip-002',
    ambulanceId: 'AMB-028',
    origin: {
      type: 'HOSPITAL_TRANSFER',
      hospitalId: 'hosp-kurla',
      hospitalName: 'Kurla General',
      pos: { lat: 19.0680, lng: 72.8800 },
    },
    destinationHospitalId: 'hosp-sion',
    caseType: 'TRAUMA',
    vitals: {
      hr: 94,
      sbp: 130,
      dbp: 84,
      spo2: 96,
      gcs: 15,
      ts: Date.now(),
    },
    priority: 'URGENT',
    priorityReasons: [
      'Major blunt trauma transfer',
      'Hemodynamically stable under fluid resuscitation',
    ],
    etaSec: 660,
    status: 'ALERT_SENT',
    updatedAt: Date.now(),
  },
  {
    id: 'trip-003',
    ambulanceId: 'AMB-099',
    origin: {
      type: 'SCENE',
      label: 'Residential call, Wadala',
      pos: { lat: 19.0190, lng: 72.8620 },
    },
    destinationHospitalId: 'hosp-sion',
    caseType: 'OTHER',
    vitals: {
      hr: 78,
      sbp: 118,
      dbp: 76,
      spo2: 98,
      gcs: 15,
      ts: Date.now(),
    },
    priority: 'STABLE',
    priorityReasons: [
      'Vitals within normal limits',
      'Non-critical medical evaluation required',
    ],
    etaSec: 1080,
    status: 'ALERT_SENT',
    updatedAt: Date.now(),
  },
];

const initialTrip: Trip = initialTrips[0];

const sionCached = (cachedRoutes as Record<string, { distanceM: number; durationS: number; coordinates: LatLng[]; steps?: string[] }>)['dadar-to-sion'];
const initialRoute: RoutePlan = {
  id: 'cached-sion-direct',
  nodes: ['node-dadar', 'node-sion'],
  pathCoordinates: sionCached?.coordinates || [],
  etaS: sionCached?.durationS || 360,
  baselineEtaS: Math.round((sionCached?.durationS || 360) * 1.35),
  distanceM: sionCached?.distanceM || 4200,
  signalsOnRoute: [],
  steps: (sionCached?.steps || [
    'Head northeast on Dr. Ambedkar Rd',
    'In 300m, keep right onto Eastern Express Hwy',
    'Continue over Sion Flyover approach',
    'Arrive at Sion Hospital',
  ]).map((inst, idx) => ({
    fromNodeId: `step-${idx}`,
    toNodeId: `step-${idx + 1}`,
    instruction: inst,
    distanceM: Math.round((sionCached?.distanceM || 4200) / 4),
    durationS: Math.round((sionCached?.durationS || 360) / 4),
    hasSignal: false,
  })),
  reasons: ['Direct Ambedkar corridor route', 'Fastest available path'],
};

export const useJyvaStore = create<JyvaStoreState>((set, get) => {
  // Initial rank
  const initialRanked = rankHospitals(initialHospitals, initialActiveAmbulance.pos, {
    caseType: initialTrip.caseType,
    priority: initialTrip.priority,
  });

  return {
    hospitals: initialHospitals,
    ambulances: initialAmbulances,
    activeAmbulanceId: initialActiveAmbulance.id,
    activeHospitalId: 'hosp-sion',
    activeTrip: initialTrip,
    incomingTrips: initialTrips,
    activeRoute: initialRoute,
    activeRouteStepIndex: 0,
    jams: [],
    isSimRunning: true,
    simSpeed: 1,
    timeSavedS: 180,
    rankedHospitals: initialRanked,

    setActiveHospitalId: (id) => set({ activeHospitalId: id }),

    setActiveAmbulanceId: (id) => {
      const amb = get().ambulances.find((a) => a.id === id);
      if (!amb) return;
      set((state) => ({
        activeAmbulanceId: id,
        activeTrip: { ...state.activeTrip, ambulanceId: id },
      }));
    },

    setDestinationHospital: async (hospitalId) => {
      const targetHospital = get().hospitals.find((h) => h.id === hospitalId);
      const activeAmb = get().ambulances.find((a) => a.id === get().activeAmbulanceId);
      if (!targetHospital || !activeAmb) return;

      const newRoute = await computeFastestRoute(
        activeAmb.pos,
        targetHospital.pos,
        hospitalId,
        get().jams
      );

      const updatedTrip: Trip = {
        ...get().activeTrip,
        destinationHospitalId: hospitalId,
        etaSec: newRoute.etaS,
        updatedAt: Date.now(),
      };

      const updatedHospitals = get().hospitals;
      const reRanked = rankHospitals(updatedHospitals, activeAmb.pos, {
        caseType: updatedTrip.caseType,
        priority: updatedTrip.priority,
      });

      set({
        activeTrip: updatedTrip,
        activeRoute: newRoute,
        activeRouteStepIndex: 0,
        rankedHospitals: reRanked,
        incomingTrips: get().incomingTrips.map((t) => (t.id === updatedTrip.id ? updatedTrip : t)),
      });

      sync.publish('trips', updatedTrip);
    },

    updateHospitalStatus: (hospitalId, updates) => {
      const updatedHospitals = get().hospitals.map((h) => {
        if (h.id !== hospitalId) return h;
        return {
          ...h,
          ...updates,
          waitingMin: updates.waitingMin !== undefined ? Math.max(0, updates.waitingMin) : h.waitingMin,
          freeErBeds: updates.freeErBeds !== undefined ? Math.max(0, updates.freeErBeds) : h.freeErBeds,
          freeIcuBeds: updates.freeIcuBeds !== undefined ? Math.max(0, updates.freeIcuBeds) : h.freeIcuBeds,
          diverted: updates.diverted !== undefined ? updates.diverted : h.diverted,
        };
      });

      const activeAmb = get().ambulances.find((a) => a.id === get().activeAmbulanceId);
      const reRanked = activeAmb
        ? rankHospitals(updatedHospitals, activeAmb.pos, {
            caseType: get().activeTrip.caseType,
            priority: get().activeTrip.priority,
          })
        : get().rankedHospitals;

      set({
        hospitals: updatedHospitals,
        rankedHospitals: reRanked,
      });

      // Broadcast update to all connected tabs / devices
      sync.publish('hospitals', updatedHospitals);
    },

    updateVitals: (vitals, caseType) => {
      const mergedVitals = {
        ...get().activeTrip.vitals,
        ...vitals,
        ts: Date.now(),
      };
      const finalCaseType = caseType || get().activeTrip.caseType;
      const evaluation = evaluatePatientPriority(mergedVitals, finalCaseType);

      const updatedTrip: Trip = {
        ...get().activeTrip,
        caseType: finalCaseType,
        vitals: mergedVitals as Trip['vitals'],
        priority: evaluation.priority,
        priorityReasons: evaluation.priorityReasons,
        updatedAt: Date.now(),
      };

      const activeAmb = get().ambulances.find((a) => a.id === get().activeAmbulanceId);
      const reRanked = activeAmb
        ? rankHospitals(get().hospitals, activeAmb.pos, {
            caseType: finalCaseType,
            priority: evaluation.priority,
          })
        : get().rankedHospitals;

      set({
        activeTrip: updatedTrip,
        rankedHospitals: reRanked,
        incomingTrips: get().incomingTrips.map((t) => (t.id === updatedTrip.id ? updatedTrip : t)),
      });

      sync.publish('trips', updatedTrip);
    },

    sendAlertToHospital: () => {
      const updatedTrip: Trip = {
        ...get().activeTrip,
        status: 'ALERT_SENT',
        updatedAt: Date.now(),
      };

      const incoming = get().incomingTrips.filter((t) => t.id !== updatedTrip.id);
      incoming.unshift(updatedTrip);

      set({
        activeTrip: updatedTrip,
        incomingTrips: incoming,
      });

      sync.publish('trips', updatedTrip);
    },

    acknowledgeTrip: (tripId) => {
      const updatedIncoming = get().incomingTrips.map((t) =>
        t.id === tripId ? { ...t, status: 'ACKNOWLEDGED' as const, updatedAt: Date.now() } : t
      );
      const updatedActiveTrip =
        get().activeTrip.id === tripId
          ? { ...get().activeTrip, status: 'ACKNOWLEDGED' as const, updatedAt: Date.now() }
          : get().activeTrip;

      set({
        incomingTrips: updatedIncoming,
        activeTrip: updatedActiveTrip,
      });

      sync.publish('trips', updatedActiveTrip);
    },

    markTripReady: (tripId) => {
      const updatedIncoming = get().incomingTrips.map((t) =>
        t.id === tripId ? { ...t, status: 'HOSPITAL_READY' as const, updatedAt: Date.now() } : t
      );
      const updatedActiveTrip =
        get().activeTrip.id === tripId
          ? { ...get().activeTrip, status: 'HOSPITAL_READY' as const, updatedAt: Date.now() }
          : get().activeTrip;

      set({
        incomingTrips: updatedIncoming,
        activeTrip: updatedActiveTrip,
      });

      sync.publish('trips', updatedActiveTrip);
    },

    addTrafficJam: async (jamOptions) => {
      const targetHospital = get().hospitals.find((h) => h.id === get().activeTrip.destinationHospitalId);
      const defaultPos = targetHospital?.id === 'hosp-kem'
        ? { lat: 19.0125, lng: 72.8450 }
        : { lat: 19.0280, lng: 72.8520 };

      const newJam: JamZone = {
        id: `jam-${Date.now()}`,
        pos: jamOptions?.pos || defaultPos,
        radiusM: jamOptions?.radiusM || 450,
        delayS: jamOptions?.delayS || 240,
        label: jamOptions?.label || 'Severe traffic bottleneck (+4 min)',
      };

      const oldRoute = get().activeRoute;
      const updatedJams = [...get().jams, newJam];
      const activeAmb = get().ambulances.find((a) => a.id === get().activeAmbulanceId);

      if (activeAmb && targetHospital) {
        const recomputedRoute = await computeFastestRoute(
          activeAmb.pos,
          targetHospital.pos,
          targetHospital.id,
          updatedJams
        );

        // Keep the old route as the alternative so it renders as a thin grey line
        if (oldRoute && (!recomputedRoute.alternates || recomputedRoute.alternates.length === 0)) {
          recomputedRoute.alternates = [oldRoute];
        }

        // Compute minutes saved once: difference between baseline congested ETA and new detour ETA
        const savedS = Math.max(180, recomputedRoute.baselineEtaS - recomputedRoute.etaS);

        const updatedTrip: Trip = {
          ...get().activeTrip,
          etaSec: recomputedRoute.etaS,
          updatedAt: Date.now(),
        };

        set({
          jams: updatedJams,
          activeRoute: recomputedRoute,
          activeRouteStepIndex: 0,
          activeTrip: updatedTrip,
          timeSavedS: savedS,
          incomingTrips: get().incomingTrips.map((t) => (t.id === updatedTrip.id ? updatedTrip : t)),
        });

        sync.publish('trips', updatedTrip);
      } else {
        set({ jams: updatedJams });
      }
    },

    clearTrafficJams: async () => {
      const activeAmb = get().ambulances.find((a) => a.id === get().activeAmbulanceId);
      const targetHospital = get().hospitals.find((h) => h.id === get().activeTrip.destinationHospitalId);

      if (activeAmb && targetHospital) {
        const clearRoute = await computeFastestRoute(activeAmb.pos, targetHospital.pos, targetHospital.id, []);
        const updatedTrip: Trip = {
          ...get().activeTrip,
          etaSec: clearRoute.etaS,
          updatedAt: Date.now(),
        };

        set({
          jams: [],
          activeRoute: clearRoute,
          activeRouteStepIndex: 0,
          activeTrip: updatedTrip,
          timeSavedS: 180,
          incomingTrips: get().incomingTrips.map((t) => (t.id === updatedTrip.id ? updatedTrip : t)),
        });

        sync.publish('trips', updatedTrip);
      } else {
        set({ jams: [] });
      }
    },

    setIsSimRunning: (running) => set({ isSimRunning: running }),
    setSimSpeed: (speed) => set({ simSpeed: Math.max(1, Math.min(5, speed)) }),

    resetDemo: async () => {
      const freshHospitals = (defaultHospitals as unknown as Hospital[]).map((h) => {
        if (h.id === 'hosp-sion') {
          return {
            ...h,
            waitingMin: 3,
            freeErBeds: 6,
            freeIcuBeds: 2,
            capacity: {
              ...(h.capacity || { erBeds: 6, erBedsTotal: 24, icuBeds: 2, icuBedsTotal: 8 }),
              erBeds: 6,
              erBedsTotal: 24,
              icuBeds: 2,
              icuBedsTotal: 8,
            },
            diverted: false,
          };
        }
        return h;
      });
      const freshAmbulances = defaultAmbulances as unknown as Ambulance[];
      const firstAmb = freshAmbulances[0];

      const freshRoute = await computeFastestRoute(
        firstAmb.pos,
        { lat: 19.0366, lng: 72.8601 },
        'hosp-sion',
        []
      );

      const freshRanked = rankHospitals(freshHospitals, firstAmb.pos, {
        caseType: initialTrips[0].caseType,
        priority: initialTrips[0].priority,
      });

      set({
        hospitals: freshHospitals,
        ambulances: freshAmbulances,
        activeAmbulanceId: firstAmb.id,
        activeTrip: initialTrips[0],
        incomingTrips: initialTrips,
        activeRoute: freshRoute,
        activeRouteStepIndex: 0,
        jams: [],
        rankedHospitals: freshRanked,
        isSimRunning: true,
        simSpeed: 1,
        timeSavedS: 180,
      });

      sync.publish('reset', { hospitals: freshHospitals, trips: initialTrips });
      sync.publish('hospitals', freshHospitals);
      sync.publish('trips', initialTrips[0]);
    },

    receiveRemoteReset: () => {
      const freshHospitals = (defaultHospitals as unknown as Hospital[]).map((h) => {
        if (h.id === 'hosp-sion') {
          return {
            ...h,
            waitingMin: 3,
            freeErBeds: 6,
            freeIcuBeds: 2,
            capacity: {
              ...(h.capacity || { erBeds: 6, erBedsTotal: 24, icuBeds: 2, icuBedsTotal: 8 }),
              erBeds: 6,
              erBedsTotal: 24,
              icuBeds: 2,
              icuBedsTotal: 8,
            },
            diverted: false,
          };
        }
        return h;
      });
      const freshAmbulances = defaultAmbulances as unknown as Ambulance[];
      const firstAmb = freshAmbulances[0];

      const freshRanked = rankHospitals(freshHospitals, firstAmb.pos, {
        caseType: initialTrips[0].caseType,
        priority: initialTrips[0].priority,
      });

      set({
        hospitals: freshHospitals,
        ambulances: freshAmbulances,
        activeAmbulanceId: firstAmb.id,
        activeTrip: initialTrips[0],
        incomingTrips: initialTrips,
        activeRoute: initialRoute,
        activeRouteStepIndex: 0,
        jams: [],
        rankedHospitals: freshRanked,
        isSimRunning: true,
        simSpeed: 1,
        timeSavedS: 180,
      });
    },

    tick: (deltaSeconds = 1) => {
      const state = get();
      if (!state.isSimRunning) return;

      const effectiveDeltaS = deltaSeconds * state.simSpeed;

      // 1. Advance active ambulance along route
      const activeAmb = state.ambulances.find((a) => a.id === state.activeAmbulanceId);
      if (activeAmb && state.activeRoute && state.activeTrip.status !== 'ARRIVED') {
        const currentStepIndex = state.activeRouteStepIndex || 0;
        const moveRes = advanceAmbulanceAlongRoute(
          activeAmb,
          state.activeRoute,
          currentStepIndex,
          effectiveDeltaS,
          state.jams.length > 0 ? 0.85 : 0.3
        );

        const updatedAmbulances = state.ambulances.map((a) =>
          a.id === activeAmb.id ? moveRes.updatedAmbulance : a
        );

        let updatedTrip = state.activeTrip;
        if (moveRes.isArrived) {
          updatedTrip = {
            ...state.activeTrip,
            status: 'ARRIVED',
            etaSec: 0,
            updatedAt: Date.now(),
          };
          sync.publish('trips', updatedTrip);
        } else if (state.activeTrip.etaSec && state.activeTrip.etaSec > 2) {
          updatedTrip = {
            ...state.activeTrip,
            etaSec: Math.max(0, state.activeTrip.etaSec - effectiveDeltaS),
            updatedAt: Date.now(),
          };
        }

        const updatedIncoming = state.incomingTrips.map((t) => {
          if (t.id === updatedTrip.id) return updatedTrip;
          if (t.etaSec && t.etaSec > 5) {
            return {
              ...t,
              etaSec: Math.max(0, t.etaSec - effectiveDeltaS),
            };
          }
          return t;
        });

        set({
          ambulances: updatedAmbulances,
          activeTrip: updatedTrip,
          incomingTrips: updatedIncoming,
          activeRouteStepIndex: moveRes.nextStepIndex,
        });

        // Broadcast active ambulance progress every 3s
        if (Math.round(state.activeTrip.etaSec || 0) % 3 === 0) {
          sync.publish('trips', updatedTrip);
        }
      }
    },

    receiveRemoteHospitalUpdate: (remoteHospitals) => {
      const activeAmb = get().ambulances.find((a) => a.id === get().activeAmbulanceId);
      const reRanked = activeAmb
        ? rankHospitals(remoteHospitals, activeAmb.pos, {
            caseType: get().activeTrip.caseType,
            priority: get().activeTrip.priority,
          })
        : get().rankedHospitals;

      set({
        hospitals: remoteHospitals,
        rankedHospitals: reRanked,
      });
    },

    receiveRemoteTripUpdate: (remoteTrip) => {
      const incoming = get().incomingTrips.map((t) => (t.id === remoteTrip.id ? remoteTrip : t));
      if (!incoming.some((t) => t.id === remoteTrip.id)) {
        incoming.unshift(remoteTrip);
      }

      set((state) => ({
        incomingTrips: incoming,
        activeTrip: state.activeTrip.id === remoteTrip.id ? remoteTrip : state.activeTrip,
      }));
    },
  };
});

// Setup global sync listeners on client mount or test environment
if (typeof window !== 'undefined' || typeof BroadcastChannel !== 'undefined') {
  sync.subscribe('hospitals', (payload) => {
    if (Array.isArray(payload)) {
      useJyvaStore.getState().receiveRemoteHospitalUpdate(payload as Hospital[]);
    }
  });

  sync.subscribe('trips', (payload) => {
    if (payload && typeof payload === 'object' && 'id' in payload) {
      useJyvaStore.getState().receiveRemoteTripUpdate(payload as Trip);
    }
  });

  sync.subscribe('reset', () => {
    useJyvaStore.getState().receiveRemoteReset();
  });
}
