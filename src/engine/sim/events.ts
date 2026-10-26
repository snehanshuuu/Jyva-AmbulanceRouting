import { Ambulance, Hospital, Incident, Signal, SimEvent } from '@/lib/types';
import { RoadNetworkGraph } from '../routing/graph';
import { calculateTriageScore } from '../triage/score';

export interface EventQueue {
  pendingEvents: SimEvent[];
  processedEvents: SimEvent[];
}

export function createEventQueue(events: SimEvent[]): EventQueue {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  return {
    pendingEvents: sorted,
    processedEvents: [],
  };
}

export function pullDueEvents(
  queue: EventQueue,
  currentSimSeconds: number
): { dueEvents: SimEvent[]; updatedQueue: EventQueue } {
  const due: SimEvent[] = [];
  const remaining: SimEvent[] = [];

  for (const ev of queue.pendingEvents) {
    if (ev.timestamp <= currentSimSeconds) {
      due.push(ev);
    } else {
      remaining.push(ev);
    }
  }

  return {
    dueEvents: due,
    updatedQueue: {
      pendingEvents: remaining,
      processedEvents: [...queue.processedEvents, ...due],
    },
  };
}

export interface EventApplicationResult {
  hospitals: Hospital[];
  ambulances: Ambulance[];
  incidents: Incident[];
  signals: Signal[];
  logTitle: string;
  logDescription: string;
  logType: 'INFO' | 'ALERT' | 'SUCCESS' | 'WARNING';
}

/**
 * Pure function that applies a single simulation event to world entities.
 */
export function applySimEvent(
  event: SimEvent,
  graph: RoadNetworkGraph,
  currentHospitals: Hospital[],
  currentAmbulances: Ambulance[],
  currentIncidents: Incident[],
  currentSignals: Signal[]
): EventApplicationResult {
  let hospitals = [...currentHospitals];
  const ambulances = [...currentAmbulances];
  let incidents = [...currentIncidents];
  let signals = [...currentSignals];

  let logTitle = `Event: ${event.type}`;
  let logDescription = event.description;
  let logType: 'INFO' | 'ALERT' | 'SUCCESS' | 'WARNING' = 'WARNING';

  switch (event.type) {
    case 'TRAFFIC_JAM': {
      const edgeIds = (event.payload.edgeIds as string[]) || [];
      const congestion = typeof event.payload.congestion === 'number' ? event.payload.congestion : 0.85;
      for (const edgeId of edgeIds) {
        graph.setEdgeCongestion(edgeId, congestion);
      }
      logTitle = 'Traffic Congestion Spike';
      logDescription = `Congestion reached ${Math.round(congestion * 100)}% on ${edgeIds.join(', ')}`;
      logType = 'WARNING';
      break;
    }

    case 'ROAD_CLOSURE': {
      const edgeId = (event.payload.edgeId as string) || '';
      if (edgeId) {
        graph.setEdgeClosed(edgeId, true);
      }
      logTitle = 'Road Closure Alert';
      logDescription = `Road segment ${edgeId} impassable due to incident/blockage`;
      logType = 'ALERT';
      break;
    }

    case 'HOSPITAL_FULL': {
      const hospitalId = (event.payload.hospitalId as string) || '';
      const reason = (event.payload.reason as string) || 'Capacity overload';
      hospitals = hospitals.map((h) =>
        h.id === hospitalId ? { ...h, diverted: true, divertReason: reason } : h
      );
      const targetHospital = hospitals.find((h) => h.id === hospitalId);
      logTitle = 'Hospital Diversion Activated';
      logDescription = `${targetHospital?.name || hospitalId} declared divert: ${reason}`;
      logType = 'ALERT';
      break;
    }

    case 'PATIENT_DETERIORATES': {
      const incidentId = (event.payload.incidentId as string) || 'inc-demo-cardiac';
      incidents = incidents.map((inc) => {
        if (inc.id !== incidentId && inc.assignedAmbulanceId !== 'amb-108-02') return inc;

        const deterioratingVitals = {
          hr: 124,
          sbp: 78,
          dbp: 48,
          spo2: 88,
          rr: 29,
          gcs: 13,
          tempC: 36.6,
          ts: Date.now(),
        };

        const existingVitals = inc.patient?.vitals || [];
        const newHistory = [...existingVitals, deterioratingVitals];
        const triageResult = calculateTriageScore(deterioratingVitals, inc.patient?.complaint || '', inc.patient?.ageBand || 'ADULT');

        return {
          ...inc,
          patient: {
            ageBand: inc.patient?.ageBand || 'ADULT',
            complaint: inc.patient?.complaint || 'Acute deterioration in transit',
            vitals: newHistory,
            priority: triageResult.priority,
            score: triageResult.score,
            reasons: triageResult.reasons,
            trend: 'DETERIORATING',
            specialtyRequired: inc.patient?.specialtyRequired || 'CARDIAC',
          },
        };
      });

      logTitle = 'Patient Clinical Deterioration';
      logDescription = 'Patient vitals collapsed (SpO2 88%, SBP 78 mmHg). Priority escalated to P1 Critical';
      logType = 'ALERT';
      break;
    }

    case 'SIGNAL_OVERRIDE': {
      const signalId = (event.payload.signalId as string) || '';
      signals = signals.map((sig) =>
        sig.id === signalId ? { ...sig, state: 'GREEN_HOLD', timeInCurrentStateS: 0 } : sig
      );
      logTitle = 'Signal Preemption Manual Override';
      logDescription = `Signal ${signalId} forced to GREEN_HOLD state`;
      logType = 'SUCCESS';
      break;
    }

    case 'NEW_INCIDENT': {
      logTitle = 'New Incident Registered';
      logDescription = event.description;
      logType = 'INFO';
      break;
    }
  }

  return {
    hospitals,
    ambulances,
    incidents,
    signals,
    logTitle,
    logDescription,
    logType,
  };
}
