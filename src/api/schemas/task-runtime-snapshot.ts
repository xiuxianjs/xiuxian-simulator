export interface TaskRuntimeSnapshotInput {
  slot: number;
  expectedConfigVersion: string;
  expectedRuntimeVersion: string;
}
export interface TaskRuntimeSnapshotResult {
  saved: boolean;
}
