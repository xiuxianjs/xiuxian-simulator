export type TaskConfigData = { slots: { alias: string; steps: string[] }[] };
export type TaskRuntimeData = { slot: number; step: number; steps: string[] };
export type TaskState = {
  version: string;
  ttlMillis: number;
  config?: TaskConfigData;
  runtime: TaskRuntimeData | null;
  slotCount: number;
  maxSteps: number;
  isMonthCard: boolean;
};
