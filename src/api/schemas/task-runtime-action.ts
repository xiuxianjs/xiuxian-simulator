import type { TaskConfigPage } from './task-config-page';

export type TaskRuntimeAction = 'start' | 'continue' | 'skip' | 'overview';
export type TaskRuntimeActionResult = {
  page?: TaskConfigPage;
  outcome: 'started' | 'next' | 'completed' | 'expected' | 'current' | 'not_running' | 'invalid_runtime' | 'empty_slot' | 'invalid_slot';
  command?: string;
  executed?: string;
  message?: string;
  slot?: number;
  step?: number;
};
