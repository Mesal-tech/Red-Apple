export type CyclePhase = 'Menstrual' | 'Follicular' | 'Ovulation' | 'Luteal';

export interface FertilityPrediction {
  currentDayOfCycle: number;
  currentPhase: CyclePhase;
  daysUntilNextPeriod: number;
  isFertileWindow: boolean;
  estimatedOvulationDate: string;
  chanceOfPregnancy: 'Low' | 'Medium' | 'High' | 'Peak';
}
