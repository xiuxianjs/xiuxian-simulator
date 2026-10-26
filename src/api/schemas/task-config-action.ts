import type { TaskConfigPage } from './task-config-page';

export type TaskConfigActionResult = {
  page?: TaskConfigPage;
  outcome: 'saved' | 'invalid_slot' | 'invalid_step' | 'empty' | 'too_long' | 'nested' | 'out_of_order' | 'alias_too_long';
  alias: string;
  steps: string[];
};
