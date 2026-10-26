import { describe, it, expect, beforeEach } from 'vitest';
import { useJyvaStore } from '@/store/useJyvaStore';
import { Hospital, Trip } from '@/lib/types';

describe('Milestone 7: Live Simulation & Two-Screen Real-Time Sync', () => {
  beforeEach(async () => {
    // Reset store before each test
    await useJyvaStore.getState().resetDemo();
  });

  describe('1. Two-Screen Trip Lifecycle Synchronization', () => {
    it('synchronizes ambulance alert transmission to hospital incoming stream', () => {
      const store = useJyvaStore.getState();
      
      // Initially, activeTrip exists
      expect(store.activeTrip.id).toBe('trip-001');

      // Paramedic taps "Send alert to hospital"
      store.sendAlertToHospital();

      const updated = useJyvaStore.getState();
      expect(updated.activeTrip.status).toBe('ALERT_SENT');
      expect(updated.incomingTrips.find((t) => t.id === 'trip-001')?.status).toBe('ALERT_SENT');
    });

    it('advances status from ALERT_SENT -> ACKNOWLEDGED when hospital triage acknowledges', () => {
      const store = useJyvaStore.getState();
      store.sendAlertToHospital();
      expect(useJyvaStore.getState().activeTrip.status).toBe('ALERT_SENT');

      // ER triage on hospital screen clicks "Acknowledge"
      store.acknowledgeTrip('trip-001');

      const updated = useJyvaStore.getState();
      expect(updated.activeTrip.status).toBe('ACKNOWLEDGED');
      expect(updated.incomingTrips.find((t) => t.id === 'trip-001')?.status).toBe('ACKNOWLEDGED');
    });

    it('advances status from ACKNOWLEDGED -> HOSPITAL_READY when resuscitation bay is prepped', () => {
      const store = useJyvaStore.getState();
      store.acknowledgeTrip('trip-001');

      // ER trauma team marks bay ready
      store.markTripReady('trip-001');

      const updated = useJyvaStore.getState();
      expect(updated.activeTrip.status).toBe('HOSPITAL_READY');
      expect(updated.incomingTrips.find((t) => t.id === 'trip-001')?.status).toBe('HOSPITAL_READY');
    });

    it('handles remote trip updates from broadcast sync', () => {
      const store = useJyvaStore.getState();

      const remoteTrip: Trip = {
        ...store.activeTrip,
        status: 'HOSPITAL_READY',
        etaSec: 180,
        updatedAt: Date.now(),
      };

      store.receiveRemoteTripUpdate(remoteTrip);

      const updated = useJyvaStore.getState();
      expect(updated.activeTrip.status).toBe('HOSPITAL_READY');
      expect(updated.activeTrip.etaSec).toBe(180);
      expect(updated.incomingTrips.find((t) => t.id === 'trip-001')?.status).toBe('HOSPITAL_READY');
    });
  });

  describe('2. Hospital Capacity & Divert Re-ranking Sync', () => {
    it('immediately re-ranks nearby hospitals when ER beds or wait times change', () => {
      const store = useJyvaStore.getState();
      const initialSionRank = store.rankedHospitals.find((r) => r.hospital.id === 'hosp-sion')?.rank;
      expect(initialSionRank).toBeDefined();

      // Hospital screen updates Sion: 45 min wait time, 0 free beds, and marks DIVERTED
      store.updateHospitalStatus('hosp-sion', {
        waitingMin: 45,
        freeErBeds: 0,
        diverted: true,
        divertReason: 'ER trauma saturation',
      });

      const updated = useJyvaStore.getState();
      const sionHosp = updated.hospitals.find((h) => h.id === 'hosp-sion');
      expect(sionHosp?.diverted).toBe(true);
      expect(sionHosp?.waitingMin).toBe(45);
      expect(sionHosp?.freeErBeds).toBe(0);

      // Re-ranking should now deprioritize Sion and elevate an available hospital
      const newSionRank = updated.rankedHospitals.find((r) => r.hospital.id === 'hosp-sion')?.rank;
      expect(newSionRank).toBeGreaterThan(initialSionRank || 1);
      expect(updated.rankedHospitals.find((r) => r.hospital.id === 'hosp-sion')?.hospital.diverted).toBe(true);
    });

    it('receives remote hospital capacity broadcasts and re-ranks in place', () => {
      const store = useJyvaStore.getState();
      const modifiedHospitals: Hospital[] = store.hospitals.map((h) =>
        h.id === 'hosp-sion'
          ? { ...h, diverted: true, waitingMin: 60, freeErBeds: 0 }
          : h
      );

      store.receiveRemoteHospitalUpdate(modifiedHospitals);

      const updated = useJyvaStore.getState();
      expect(updated.hospitals.find((h) => h.id === 'hosp-sion')?.diverted).toBe(true);
      expect(updated.rankedHospitals.find((r) => r.hospital.id === 'hosp-sion')?.hospital.diverted).toBe(true);
    });
  });

  describe('3. Dynamic Jam Injection & Detour Avoidance', () => {
    it('detects bottleneck on direct route and calculates detour with >= 3 min saved', async () => {
      const store = useJyvaStore.getState();
      expect(store.jams.length).toBe(0);

      // Paramedic or demo operator clicks "Add traffic jam"
      await store.addTrafficJam();

      const updated = useJyvaStore.getState();
      expect(updated.jams.length).toBe(1);
      expect(updated.activeRoute?.id).toContain('detour');
      // Time saved vs congested route should be >= 180s (3 minutes)
      expect(updated.timeSavedS).toBeGreaterThanOrEqual(180);
      expect(updated.activeTrip.etaSec).toBe(updated.activeRoute?.etaS);
    });

    it('restores direct route when traffic jam is cleared', async () => {
      const store = useJyvaStore.getState();
      await store.addTrafficJam();
      expect(useJyvaStore.getState().jams.length).toBe(1);

      // Paramedic clears the jam
      await store.clearTrafficJams();

      const updated = useJyvaStore.getState();
      expect(updated.jams.length).toBe(0);
      expect(updated.activeRoute?.id).toContain('direct');
    });
  });

  describe('4. Live Movement Simulation & Clock Progression', () => {
    it('advances active ambulance along route waypoints on tick()', () => {
      const store = useJyvaStore.getState();
      const initialPos = { ...store.ambulances[0].pos };
      const initialEta = store.activeTrip.etaSec;

      // Ensure sim is running
      store.setIsSimRunning(true);
      store.setSimSpeed(1);

      // Tick 5 seconds
      store.tick(5);

      const updated = useJyvaStore.getState();
      const updatedPos = updated.ambulances[0].pos;

      // Ambulance should have progressed towards destination
      expect(updatedPos.lat).not.toBe(initialPos.lat);
      expect(updated.activeRouteStepIndex).toBeGreaterThan(0);
      if (initialEta && updated.activeTrip.etaSec) {
        expect(updated.activeTrip.etaSec).toBeLessThan(initialEta);
      }
    });

    it('scales progression speed with simulation multiplier (2x, 4x)', () => {
      const store = useJyvaStore.getState();
      store.setSimSpeed(4);
      expect(useJyvaStore.getState().simSpeed).toBe(4);

      const initialStep = store.activeRouteStepIndex;
      store.tick(2); // 2 real seconds * 4x = 8 effective seconds

      expect(useJyvaStore.getState().activeRouteStepIndex).toBeGreaterThan(initialStep);
    });

    it('marks trip as ARRIVED when reaching destination waypoint', () => {
      const store = useJyvaStore.getState();
      const activeRoute = store.activeRoute;
      const totalCoords = activeRoute?.pathCoordinates?.length || 20;

      // Manually set step index to the final destination waypoint
      useJyvaStore.setState({
        activeRouteStepIndex: totalCoords - 1,
      });

      // Tick to process arrival
      store.tick(1);

      const updated = useJyvaStore.getState();
      expect(updated.activeTrip.status).toBe('ARRIVED');
      expect(updated.activeTrip.etaSec).toBe(0);
    });

    it('pauses movement when isSimRunning is false', () => {
      const store = useJyvaStore.getState();
      store.setIsSimRunning(false);

      const stepBefore = store.activeRouteStepIndex;
      const posBefore = { ...store.ambulances[0].pos };

      store.tick(5);

      const updated = useJyvaStore.getState();
      expect(updated.activeRouteStepIndex).toBe(stepBefore);
      expect(updated.ambulances[0].pos.lat).toBe(posBefore.lat);
      expect(updated.ambulances[0].pos.lng).toBe(posBefore.lng);
    });
  });

  describe('5. Clean Demo Reset Across Screens', () => {
    it('restores initial baseline Sion capacity, cleared jams, and route step', async () => {
      const store = useJyvaStore.getState();

      // Mutate state: add jam, divert Sion, move ambulance
      await store.addTrafficJam();
      store.updateHospitalStatus('hosp-sion', { diverted: true, waitingMin: 99 });
      store.tick(15);

      expect(useJyvaStore.getState().jams.length).toBe(1);
      expect(useJyvaStore.getState().hospitals.find((h) => h.id === 'hosp-sion')?.diverted).toBe(true);

      // Perform demo reset
      await store.resetDemo();

      const resetState = useJyvaStore.getState();
      expect(resetState.jams.length).toBe(0);
      expect(resetState.activeRouteStepIndex).toBe(0);
      const sion = resetState.hospitals.find((h) => h.id === 'hosp-sion');
      expect(sion?.diverted).toBe(false);
      expect(sion?.waitingMin).toBe(3);
      expect(sion?.freeErBeds).toBe(6);
      expect(sion?.freeIcuBeds).toBe(2);
      expect(resetState.activeTrip.status).toBe('PICKED_UP');
      const sionRank = resetState.rankedHospitals.find((r) => r.hospital.id === 'hosp-sion');
      expect(sionRank?.hospital.diverted).toBe(false);
      expect(sionRank?.hospital.waitingMin).toBe(3);
    });

    it('handles remote reset event via receiveRemoteReset without re-broadcasting loops', () => {
      const store = useJyvaStore.getState();
      store.updateHospitalStatus('hosp-sion', { diverted: true });

      // Receive remote reset signal from the other tab
      store.receiveRemoteReset();

      const state = useJyvaStore.getState();
      const sion = state.hospitals.find((h) => h.id === 'hosp-sion');
      expect(sion?.diverted).toBe(false);
      expect(state.jams.length).toBe(0);
      expect(state.activeRouteStepIndex).toBe(0);
    });
  });
});
