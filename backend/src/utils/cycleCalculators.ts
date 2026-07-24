import { CyclePhase, FertilityPrediction } from '../types';

export function calculateFertilityPrediction(
  lastPeriodStartDate: string,
  periodDurationDays = 5,
  cycleLengthDays = 28,
  currentDate: Date = new Date()
): FertilityPrediction {
  const start = new Date(lastPeriodStartDate);
  const diffTime = Math.abs(currentDate.getTime() - start.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const currentDayOfCycle = (diffDays % cycleLengthDays) + 1;
  const daysUntilNextPeriod = cycleLengthDays - currentDayOfCycle + 1;
  const estimatedOvulationDay = cycleLengthDays - 14;

  let currentPhase: CyclePhase = 'Follicular';
  let isFertileWindow = false;
  let chanceOfPregnancy: FertilityPrediction['chanceOfPregnancy'] = 'Low';

  if (currentDayOfCycle <= periodDurationDays) {
    currentPhase = 'Menstrual';
    chanceOfPregnancy = 'Low';
  } else if (currentDayOfCycle < estimatedOvulationDay - 5) {
    currentPhase = 'Follicular';
    chanceOfPregnancy = 'Low';
  } else if (
    currentDayOfCycle >= estimatedOvulationDay - 5 &&
    currentDayOfCycle <= estimatedOvulationDay + 1
  ) {
    currentPhase = 'Ovulation';
    isFertileWindow = true;
    if (currentDayOfCycle === estimatedOvulationDay) {
      chanceOfPregnancy = 'Peak';
    } else if (currentDayOfCycle >= estimatedOvulationDay - 2) {
      chanceOfPregnancy = 'High';
    } else {
      chanceOfPregnancy = 'Medium';
    }
  } else {
    currentPhase = 'Luteal';
    chanceOfPregnancy = 'Low';
  }

  const ovulationDateObj = new Date(start);
  ovulationDateObj.setDate(start.getDate() + (estimatedOvulationDay - 1));
  const estimatedOvulationDate = ovulationDateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return {
    currentDayOfCycle,
    currentPhase,
    daysUntilNextPeriod,
    isFertileWindow,
    estimatedOvulationDate,
    chanceOfPregnancy,
  };
}
