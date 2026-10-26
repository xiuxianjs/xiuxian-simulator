import type { CaveOverviewPlot } from './cave-overview-query';

/** Server-owned receipt for opening one field. */
export interface CaveCultivateResult {
  message: string;
  plot: Omit<CaveOverviewPlot, 'seedMatureHours' | 'seedStageSplit'>;
}

/** Server-owned receipt for one field or the no-index batch plant command. */
export interface CavePlantResult {
  message: string;
  plot?: Omit<CaveOverviewPlot, 'seedMatureHours' | 'seedStageSplit'> | null;
  affectedCount?: number;
  remainingPlots?: number;
  needsSeedSelection?: boolean;
}
