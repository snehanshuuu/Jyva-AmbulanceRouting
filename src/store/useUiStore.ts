import { create } from 'zustand';

interface UiStoreState {
  showTrafficCongestion: boolean;
  showSignalPreemptions: boolean;
  activeRoleTab: 'command' | 'ambulance' | 'hospital' | 'traffic' | 'analytics';
  selectedIncidentId: string | null;
  toggleCongestion: () => void;
  toggleSignals: () => void;
  setActiveRoleTab: (tab: 'command' | 'ambulance' | 'hospital' | 'traffic' | 'analytics') => void;
  setSelectedIncidentId: (id: string | null) => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  showTrafficCongestion: true,
  showSignalPreemptions: true,
  activeRoleTab: 'command',
  selectedIncidentId: 'inc-demo-cardiac',
  toggleCongestion: () => set((state) => ({ showTrafficCongestion: !state.showTrafficCongestion })),
  toggleSignals: () => set((state) => ({ showSignalPreemptions: !state.showSignalPreemptions })),
  setActiveRoleTab: (activeRoleTab) => set({ activeRoleTab }),
  setSelectedIncidentId: (selectedIncidentId) => set({ selectedIncidentId }),
}));
