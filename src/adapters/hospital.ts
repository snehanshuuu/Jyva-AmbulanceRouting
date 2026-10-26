import { Hospital, HospitalCapacity } from '@/lib/types';
import defaultHospitals from '@/data/hospitals.json';

export interface PreArrivalAlertPayload {
  incidentId: string;
  ambulanceCallSign: string;
  etaSeconds: number;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  chiefComplaint: string;
  score: number;
  reasons: string[];
  suggestedPreparation: string[];
  timestamp: number;
}

/**
 * Adapter interface for hospital feeds (HIS / EMR / Bed Management / HL7 / FHIR or Simulated).
 */
export interface HospitalFeed {
  getHospitals(): Promise<Hospital[]>;
  getHospital(id: string): Promise<Hospital | null>;
  getCapacity(id: string): Promise<HospitalCapacity | null>;
  updateCapacity(id: string, capacity: Partial<HospitalCapacity>): Promise<void>;
  setDiverted(id: string, diverted: boolean, reason?: string): Promise<void>;
  sendAlert(id: string, payload: PreArrivalAlertPayload): Promise<void>;
  getAlerts(id: string): Promise<PreArrivalAlertPayload[]>;
}

/**
 * In-memory simulated hospital feed.
 */
export class SimulatedHospitalFeed implements HospitalFeed {
  private hospitals: Map<string, Hospital> = new Map();
  private alerts: Map<string, PreArrivalAlertPayload[]> = new Map();

  constructor(initialHospitals?: Hospital[]) {
    const list = initialHospitals || (defaultHospitals as unknown as Hospital[]);
    for (const hosp of list) {
      this.hospitals.set(hosp.id, { ...hosp });
    }
  }

  async getHospitals(): Promise<Hospital[]> {
    return Array.from(this.hospitals.values());
  }

  async getHospital(id: string): Promise<Hospital | null> {
    return this.hospitals.get(id) ?? null;
  }

  async getCapacity(id: string): Promise<HospitalCapacity | null> {
    const h = this.hospitals.get(id);
    return h?.capacity ? { ...h.capacity } : null;
  }

  async updateCapacity(id: string, capacity: Partial<HospitalCapacity>): Promise<void> {
    const h = this.hospitals.get(id);
    if (!h) return;
    const currentCapacity: HospitalCapacity = h.capacity || {
      erBeds: h.freeErBeds || 0,
      erBedsTotal: 10,
      icuBeds: h.freeIcuBeds || 0,
      icuBedsTotal: 5,
    };
    h.capacity = { ...currentCapacity, ...capacity };
    // update erLoad proportionally
    h.erLoad = 1 - (h.capacity.erBeds / Math.max(1, h.capacity.erBedsTotal));
    this.hospitals.set(id, h);
  }

  async setDiverted(id: string, diverted: boolean, reason?: string): Promise<void> {
    const h = this.hospitals.get(id);
    if (!h) return;
    h.diverted = diverted;
    h.divertReason = reason;
    this.hospitals.set(id, h);
  }

  async sendAlert(id: string, payload: PreArrivalAlertPayload): Promise<void> {
    if (!this.alerts.has(id)) {
      this.alerts.set(id, []);
    }
    this.alerts.get(id)!.unshift(payload);
  }

  async getAlerts(id: string): Promise<PreArrivalAlertPayload[]> {
    return this.alerts.get(id) ?? [];
  }
}

export const globalHospitalAdapter = new SimulatedHospitalFeed();
