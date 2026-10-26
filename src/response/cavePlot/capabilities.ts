import type { CaveOverviewPlot } from '@src/api/schemas/cave-overview-query';

type ActionButton = { label: string; command: string };
type VisitCapability = { kind: 'collaborate' | 'collaborateHarvest' | 'steal'; careAction?: 'water' | 'worm' | 'weed' };

const care = { water: { label: '浇灌', command: '/浇灌' }, worm: { label: '除虫', command: '/除虫' }, weed: { label: '除草', command: '/除草' } } as const;

/** Stable server capability kinds are the sole source of cave action eligibility. */
export function ownPlotActions(plot: CaveOverviewPlot): ActionButton[] {
  return plot.capabilities.flatMap(capability => {
    switch (capability.kind) {
      case 'plant':
        return [{ label: '播种', command: `/播种 ${plot.plotIndex}` }];
      case 'harvest':
        return [{ label: '收割', command: `/收割 ${plot.plotIndex}` }];
      case 'accelerate':
        return [{ label: '加速', command: `/灵田加速 ${plot.plotIndex}` }];
      case 'upgrade':
        return [{ label: '升级', command: `/升级灵田 ${plot.plotIndex}` }];
      case 'cultivate':
        return [{ label: '开垦', command: `/开垦 ${plot.plotIndex}` }];
      case 'care': {
        const item = capability.careAction && care[capability.careAction];

        return item ? [{ label: item.label, command: `${item.command} ${plot.plotIndex}` }] : [];
      }
    }
  });
}

export function visitedPlotActions(plot: CaveOverviewPlot, ownerUid: number, capabilities: VisitCapability[]): ActionButton[] {
  const has = (kind: VisitCapability['kind'], careAction?: VisitCapability['careAction']) => capabilities.some(item => item.kind === kind && item.careAction === careAction);

  return plot.capabilities.flatMap(capability => {
    if (capability.kind === 'harvest' && has('collaborateHarvest')) {
      return [{ label: '协作收割', command: `/协作灵田 ${ownerUid} 收割 ${plot.plotIndex}` }];
    }
    if (capability.kind === 'harvest' && has('steal')) {
      return [{ label: '偷药', command: `/偷药 ${ownerUid} ${plot.plotIndex}` }];
    }
    if (capability.kind === 'care' && capability.careAction && has('collaborate', capability.careAction)) {
      const item = care[capability.careAction];

      return [{ label: `协作${item.label}`, command: `/协作灵田 ${ownerUid} ${item.label} ${plot.plotIndex}` }];
    }

    return [];
  });
}
