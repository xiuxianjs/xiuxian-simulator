import type { TaskSlotClearWithLimits } from '../../schemas/task-config-page';
import type { TaskRuntimeCursorResult } from '../../schemas/task-runtime-cursor';
import type { TaskRuntimeView } from '../../schemas/task-runtime-view';
import type { TaskSlotClearResult } from '../../schemas/task-slot-clear';
import type { TaskConfigData, TaskRuntimeData, TaskState } from '../../schemas/tasks';
import type { TaskRuntimeCancelResult } from '../../schemas/task-runtime-cancel';
import type { TaskConfigLimits } from '../../schemas/tasks-config-limits';
import type { TaskRuntimeSnapshotResult } from '../../schemas/task-runtime-snapshot';
import type { TaskRuntimeActionResult } from '../../schemas/task-runtime-action';
import type { TaskConfigActionResult } from '../../schemas/task-config-action';
export interface CrossPlatformOperations {
  post_players_id_tasks_config_actions: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string };
    body: { action: 'step' | 'alias' | 'clear'; slot: number; step?: number; content?: string; alias?: string };
    response: TaskConfigActionResult | TaskSlotClearWithLimits;
  };
  post_players_id_tasks_slots_slot_steps: {
    path: { id: number; slot: number };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string };
    body: { step: number; content: string };
    response: TaskConfigActionResult;
  };
  put_players_id_tasks_slots_slot_alias: {
    path: { id: number; slot: number };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string };
    body: { alias: string };
    response: TaskConfigActionResult;
  };
  post_players_id_tasks_runtime_actions: {
    path: { id: number };
    query: { page?: boolean };
    headers: { 'X-Request-ID'?: string };
    body: { action: 'start' | 'continue' | 'skip' | 'overview'; input?: string; slot?: number };
    response: TaskRuntimeActionResult;
  };
  post_players_id_tasks_runtime_snapshot: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: { slot: number; expectedConfigVersion: string; expectedRuntimeVersion: string };
    response: TaskRuntimeSnapshotResult;
  };
  patch_players_id_tasks_runtime_cursor: {
    path: { id: number };
    query: never;
    headers: never;
    body: { expectedVersion: string; step: number | null };
    response: TaskRuntimeCursorResult;
  };

  get_players_id_tasks_runtime_view: { path: { id: number }; query: never; headers: never; body: never; response: TaskRuntimeView };
  delete_players_id_tasks_slots_slot: {
    path: { id: number; slot: number };
    query: never;
    headers: never;
    body: never;
    response: TaskSlotClearResult;
  };

  get_players_id_tasks: { path: { id: number }; query: never; headers: never; body: never; response: TaskState };
  get_players_id_tasks_runtime: { path: { id: number }; query: never; headers: never; body: never; response: TaskState };
  get_players_id_tasks_limits: { path: { id: number }; query: never; headers: never; body: never; response: TaskConfigLimits };
  put_players_id_tasks: {
    path: { id: number };
    query: never;
    headers: never;
    body: { expectedVersion: string; config: TaskConfigData };
    response: { saved: boolean };
  };
  put_players_id_tasks_runtime: {
    path: { id: number };
    query: never;
    headers: never;
    body: { expectedVersion: string; runtime: TaskRuntimeData | null };
    response: { saved: boolean };
  };
  delete_players_id_tasks_runtime: { path: { id: number }; query: never; headers: never; body: never; response: TaskRuntimeCancelResult };
}
