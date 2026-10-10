import { CyclePhase, FertilityPrediction } from '../types';

function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function calculateFertilityPrediction(
  lastPeriodStartDate: string,
  periodDurationDays = 5,
  cycleLengthDays = 28,
  currentDate: Date = new Date()
): FertilityPrediction {
  const startRaw = new Date(lastPeriodStartDate);
  const startYear = startRaw.getFullYear();
  const startMonth = startRaw.getMonth();
  const startDay = startRaw.getDate();
  const start = new Date(startYear, startMonth, startDay);

  const curYear = currentDate.getFullYear();
  const curMonth = currentDate.getMonth();
  const curDay = currentDate.getDate();
  const today = new Date(curYear, curMonth, curDay);

  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const currentCycleDay = ((((diffDays) % cycleLengthDays) + cycleLengthDays) % cycleLengthDays) + 1;
  const ovulationCycleDay = Math.max(cycleLengthDays - 14, 1);
  const fertileStartCycleDay = Math.max(ovulationCycleDay - 5, 1);
  const fertileEndCycleDay = ovulationCycleDay + 1;

  // Current active cycle start date
  const cyclesPassed = Math.floor(diffDays / cycleLengthDays);
  const currentCycleStart = new Date(start.getTime() + cyclesPassed * cycleLengthDays * 24 * 60 * 60 * 1000);
  const nextPeriodDate = new Date(currentCycleStart.getTime() + cycleLengthDays * 24 * 60 * 60 * 1000);

  const diffUntilPeriodMs = nextPeriodDate.getTime() - today.getTime();
  const daysUntilNextPeriod = Math.max(Math.round(diffUntilPeriodMs / (1000 * 60 * 60 * 24)), 1);

  // Fertile window calculation: if current cycle's fertile window is in the past, predict next cycle's fertile window
  const currentFertileEnd = new Date(currentCycleStart.getTime() + (fertileEndCycleDay - 1) * 24 * 60 * 60 * 1000);
  let activeOrNextCycleStart = currentCycleStart;
  if (today > currentFertileEnd) {
    activeOrNextCycleStart = nextPeriodDate;
  }

  const fertileWindowStart = new Date(activeOrNextCycleStart.getTime() + (fertileStartCycleDay - 1) * 24 * 60 * 60 * 1000);
  const fertileWindowEnd = new Date(activeOrNextCycleStart.getTime() + (fertileEndCycleDay - 1) * 24 * 60 * 60 * 1000);
  const estimatedOvulation = new Date(activeOrNextCycleStart.getTime() + (ovulationCycleDay - 1) * 24 * 60 * 60 * 1000);

  let currentPhase: CyclePhase = 'Follicular';
  let isFertileWindow = false;
  let chanceOfPregnancy: FertilityPrediction['chanceOfPregnancy'] = 'Low';

  if (currentCycleDay <= periodDurationDays) {
    currentPhase = 'Menstrual';
    chanceOfPregnancy = 'Low';
  } else if (currentCycleDay < fertileStartCycleDay) {
    currentPhase = 'Follicular';
    chanceOfPregnancy = 'Low';
  } else if (currentCycleDay >= fertileStartCycleDay && currentCycleDay <= fertileEndCycleDay) {
    currentPhase = 'Ovulation';
    isFertileWindow = true;
    if (currentCycleDay === ovulationCycleDay) {
      chanceOfPregnancy = 'Peak';
    } else if (currentCycleDay >= ovulationCycleDay - 2) {
      chanceOfPregnancy = 'High';
    } else {
      chanceOfPregnancy = 'Medium';
    }
  } else {
    currentPhase = 'Luteal';
    chanceOfPregnancy = 'Low';
  }

  return {
    currentDayOfCycle: currentCycleDay,
    currentCycleDay,
    currentPhase,
    daysUntilNextPeriod,
    nextPeriodStartDate: toLocalIsoDate(nextPeriodDate),
    isFertileWindow,
    fertileWindowStart: toLocalIsoDate(fertileWindowStart),
    fertileWindowEnd: toLocalIsoDate(fertileWindowEnd),
    estimatedOvulationDate: toLocalIsoDate(estimatedOvulation),
    chanceOfPregnancy,
    chanceOfGettingPregnant: chanceOfPregnancy,
    cycleLength: cycleLengthDays,
    periodDuration: periodDurationDays,
  };
}

export interface CyclePredictionOptions {
  lastPeriodDate: string;
  cycleLength?: number;
  periodDuration?: number;
  currentCycleDay?: number;
  currentDate?: Date;
}

/**
 * Calculates next cycle predictions and fertile windows.
 * Accepts either an options object or positional arguments.
 */
export function calculateNextCyclePredictions(
  optionsOrDate: CyclePredictionOptions | string,
  periodDuration?: number,
  cycleLength?: number,
  currentDate?: Date
) {
  if (typeof optionsOrDate === 'string') {
    const prediction = calculateFertilityPrediction(
      optionsOrDate,
      periodDuration,
      cycleLength,
      currentDate
    );
    return {
      ...prediction,
      currentPhase:
        prediction.currentPhase === 'Ovulation'
          ? 'ovulatory'
          : prediction.currentPhase.toLowerCase(),
    };
  }

  const prediction = calculateFertilityPrediction(
    optionsOrDate.lastPeriodDate,
    optionsOrDate.periodDuration ?? 5,
    optionsOrDate.cycleLength ?? 28,
    optionsOrDate.currentDate ?? new Date()
  );

  return {
    ...prediction,
    currentPhase:
      prediction.currentPhase === 'Ovulation'
        ? 'ovulatory'
        : prediction.currentPhase.toLowerCase(),
  };
}
