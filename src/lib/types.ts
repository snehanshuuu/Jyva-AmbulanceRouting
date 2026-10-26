export type LatLng = {
  lat: number;
  lng: number;
};

export interface Node {
  id: string;
  name?: string;
  pos: LatLng;
  signalId?: string;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  name?: string;
  lengthM: number;
  baseSpeedKmh: number;
  congestion: number; // 0..1 (0 free, 1 gridlock)
  closed: boolean;
}

export type SignalState = 'NORMAL' | 'PREEMPT_REQUESTED' | 'GREEN_HOLD' | 'RECOVERY';

export interface Signal {
  id: string;
  nodeId: string;
  name: string;
  pos: LatLng;
  state: SignalState;
  baseDelayS: number;
  activePreemptEtaS?: number;
  preemptAmbulanceId?: string;
  timeInCurrentStateS?: number;
}

export type Priority = 'CRITICAL' | 'URGENT' | 'STABLE';
export type PatientPriority = 'P1' | 'P2' | 'P3' | 'P4' | Priority;
export type CaseType = 'CARDIAC' | 'TRAUMA' | 'STROKE' | 'MATERNITY' | 'OTHER';

export type AmbulanceType = 'BLS' | 'ALS';
export type AmbulanceStatus =
  | 'AVAILABLE'
  | 'DISPATCHED'
  | 'EN_ROUTE_SCENE'
  | 'AT_SCENE'
  | 'TRANSPORTING'
  | 'ARRIVED'
  | 'OFFLINE';

export interface AmbulanceOperator {
  type: 'HOSPITAL' | 'GOVT_108' | 'PRIVATE';
  name: string;
}

export interface Ambulance {
  id: string; // e.g. "AMB-014"
  plate: string;
  callSign: string;
  type?: AmbulanceType;
  status: AmbulanceStatus;
  operator: AmbulanceOperator;
  baseHospitalId?: string;
  pos: LatLng;
  heading?: number; // degrees 0-360
  speedKmh?: number;
  incidentId?: string;
  routeId?: string;
  assignedHospitalId?: string;
  driverName?: string;
  paramedicName?: string;
  contactNumber?: string;
  equipment?: string[];
}

export type IncidentType =
  | 'CARDIAC'
  | 'TRAUMA'
  | 'STROKE'
  | 'MATERNITY'
  | 'BURNS'
  | 'RESPIRATORY'
  | 'OTHER';

export type IncidentState =
  | 'CREATED'
  | 'DISPATCHED'
  | 'EN_ROUTE'
  | 'AT_SCENE'
  | 'TRANSPORTING'
  | 'ARRIVED'
  | 'CLOSED';

export interface Vitals {
  hr: number; // Heart rate (bpm)
  sbp: number; // Systolic BP (mmHg)
  dbp?: number; // Diastolic BP (mmHg)
  spo2: number; // Oxygen saturation (%)
  rr?: number; // Respiratory rate (/min)
  gcs: number; // Glasgow Coma Scale (3-15)
  tempC?: number; // Temperature (°C)
  ts: number; // Timestamp (epoch ms)
}

export type AgeBand = 'CHILD' | 'ADULT' | 'ELDERLY';
export type PatientTrend = 'IMPROVING' | 'STABLE' | 'DETERIORATING';

export interface Patient {
  id?: string;
  ageBand: AgeBand;
  gender?: 'M' | 'F' | 'OTHER';
  complaint: string;
  vitals: Vitals[];
  priority: Priority | 'P1' | 'P2' | 'P3' | 'P4';
  score?: number;
  reasons: string[];
  trend: PatientTrend;
  specialtyRequired?: SpecialtyType;
}

export interface Incident {
  id: string;
  title: string;
  pos: LatLng;
  address: string;
  type: IncidentType;
  state: IncidentState;
  createdAt: number;
  assignedAmbulanceId?: string;
  assignedHospitalId?: string;
  patient?: Patient;
  notes?: string;
}

export type SpecialtyType =
  | 'CARDIAC'
  | 'TRAUMA'
  | 'STROKE'
  | 'MATERNITY'
  | 'BURNS'
  | 'PEDIATRICS'
  | 'GENERAL'
  | 'OTHER';

export interface HospitalCapacity {
  erBeds: number;
  erBedsTotal: number;
  icuBeds: number;
  icuBedsTotal: number;
  ventilators?: number;
  ventilatorsTotal?: number;
}

export interface Hospital {
  id: string;
  name: string;
  shortName?: string;
  pos: LatLng;
  address: string;
  phone: string;
  specialties: (CaseType | SpecialtyType)[];
  waitingMin?: number; // editable from Hospital Screen
  freeErBeds?: number; // editable
  freeIcuBeds?: number; // editable
  diverted: boolean; // editable
  divertReason?: string;
  capacity?: HospitalCapacity;
  erLoad?: number; // 0..1
  readinessLeadTimeMinutes?: number;
}

export type TripOrigin =
  | { type: 'SCENE'; label: string; pos: LatLng }
  | { type: 'HOSPITAL_TRANSFER'; hospitalId: string; pos: LatLng; hospitalName?: string };

export type TripStatus =
  | 'PICKED_UP'
  | 'ALERT_SENT'
  | 'ACKNOWLEDGED'
  | 'HOSPITAL_READY'
  | 'ARRIVED';

export interface Trip {
  id: string;
  ambulanceId: string;
  origin: TripOrigin;
  destinationHospitalId?: string;
  caseType: CaseType;
  vitals?: {
    hr: number;
    sbp: number;
    spo2: number;
    gcs: number;
    ts: number;
    dbp?: number;
    rr?: number;
    tempC?: number;
  };
  priority?: Priority;
  priorityReasons?: string[];
  etaSec?: number;
  routeId?: string;
  status: TripStatus;
  updatedAt: number;
}

export interface RouteStep {
  fromNodeId: string;
  toNodeId: string;
  instruction: string;
  distanceM: number;
  durationS: number;
  hasSignal: boolean;
  signalId?: string;
  modifier?: string;
  maneuverType?: string;
  streetName?: string;
  location?: LatLng;
}

export interface RoutePlan {
  id: string;
  nodes: string[];
  pathCoordinates?: LatLng[];
  steps?: RouteStep[];
  etaS: number;
  baselineEtaS: number;
  distanceM: number;
  signalsOnRoute: string[];
  congestionFactor?: number;
  reasons?: string[];
  alternates?: RoutePlan[];
}

export interface HospitalRecommendation {
  hospital: Hospital;
  rank: number;
  totalMin: number;
  etaMinutes: number;
  waitingMinutes: number;
  distanceMeters: number;
  isRecommended: boolean;
  reason: string;
  isEligible?: boolean;
  ineligibleReason?: string;
  shortReason?: string;
  overallScore?: number;
  scores?: {
    etaScore: number;
    specialtyMatch: number;
    capacityScore: number;
    erLoadPenalty: number;
  };
  reasons?: string[];
  recommendedPreparation?: string[];
}

export interface SimEvent {
  id: string;
  type:
    | 'TRAFFIC_JAM'
    | 'ROAD_CLOSURE'
    | 'HOSPITAL_FULL'
    | 'PATIENT_DETERIORATES'
    | 'NEW_INCIDENT'
    | 'SIGNAL_OVERRIDE';
  timestamp: number;
  description: string;
  payload: Record<string, unknown>;
}

export interface SimScenario {
  id: string;
  title: string;
  description: string;
  targetAmbulanceId: string;
  targetHospitalId: string;
  estimatedMinutes: number;
  events: SimEvent[];
}
