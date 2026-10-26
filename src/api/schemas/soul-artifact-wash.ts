export type SoulArtifactWashAction = 'add' | 'replace' | 'upgrade';

export interface SoulArtifactWashStep {
  success: boolean;
  action?: SoulArtifactWashAction;
  message?: string;
  details?: string[];
}

export interface SoulArtifactWashPending {
  instanceId: number;
  artifactId: number;
  artifactName: string;
  times: number;
  totalSuccess: number;
  createdAt: number;
  finalMessage: string;
  results: SoulArtifactWashStep[];
}

export interface SoulArtifactWashPreview {
  pending: SoulArtifactWashPending;
}

export interface SoulArtifactWashConfirm {
  pending: SoulArtifactWashPending;
  message: string;
}
