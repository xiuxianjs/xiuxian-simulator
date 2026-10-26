import type { TaskRuntimeData } from './tasks';
export type TaskRuntimeView = { version: string; ttlMillis: number; runtime: TaskRuntimeData | null };
