import type { TaskConfigData } from './tasks';
import type { TaskConfigLimits } from './tasks-config-limits';

export type TaskConfigPage = { config: TaskConfigData; limits: TaskConfigLimits };

export type TaskSlotClearWithLimits = { outcome: 'invalid_slot' | 'cleared'; limits: TaskConfigLimits; result?: { cleared: true; runtimeCleared: boolean } };
