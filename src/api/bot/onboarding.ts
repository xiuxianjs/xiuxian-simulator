export type OnboardingView = {
  status: 'absent' | 'active' | 'soft' | 'completed' | 'exited';
  phase: string;
  version: number;
  title: string;
  lines: string[];
  feedback: string[];
  actions: { label: string; command: string }[];
  choiceBound?: boolean;
};

export function parseOnboarding(value: unknown): OnboardingView {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('教学状态响应不完整');
  }
  const row = value as Record<string, unknown>;
  const lines = (v: unknown): v is string[] => Array.isArray(v) && v.every(line => typeof line === 'string');

  if (
    !['absent', 'active', 'soft', 'completed', 'exited'].includes(String(row.status)) ||
    typeof row.phase !== 'string' ||
    typeof row.title !== 'string' ||
    !Number.isSafeInteger(row.version) ||
    Number(row.version) < 0 ||
    (row.choiceBound !== undefined && typeof row.choiceBound !== 'boolean') ||
    (row.choiceBound === true && (row.status !== 'completed' || Number(row.version) < 1)) ||
    !lines(row.lines) ||
    !lines(row.feedback) ||
    !Array.isArray(row.actions) ||
    row.actions.length > 2 ||
    !row.actions.every(action => action && typeof action === 'object' && typeof action.label === 'string' && typeof action.command === 'string')
  ) {
    throw new Error('教学状态字段不完整');
  }

  return row as OnboardingView;
}
