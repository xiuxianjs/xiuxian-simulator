/** Existing cave access facts and persisted interaction log text; no plot settlement. */
export interface CaveLogQueryData {
  realmName: string | null;
  canUseCave: boolean;
  hasCavePlot: boolean;
  lockedMessage: string;
  logs: string[];
  page: number;
  total: number;
  totalPages: number;
  nextCursor?: string;
}
