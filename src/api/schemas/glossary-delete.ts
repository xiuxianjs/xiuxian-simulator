export type GlossaryEditPermissionData = { allowed: boolean };
export type GlossaryDeleteResult = {
  outcome: 'deleted' | 'not_found' | 'rewarded' | 'forbidden' | 'log_failed';
  entryId: number | null;
  stateChanged: boolean;
  logWritten: boolean | null;
};
