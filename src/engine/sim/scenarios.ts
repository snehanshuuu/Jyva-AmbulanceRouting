import { SimScenario } from '@/lib/types';
import defaultScenarios from '@/data/scenarios.json';

export function loadAllScenarios(): SimScenario[] {
  return defaultScenarios as SimScenario[];
}

export function findScenarioById(id: string): SimScenario | undefined {
  return (defaultScenarios as SimScenario[]).find((s) => s.id === id);
}
