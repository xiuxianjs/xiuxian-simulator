export type OnboardingBranchMenu = {
  lines: string[];
  items: { id: string; name: string; description: string; command: string; learned: boolean }[];
};
export type OnboardingView = {
  status: 'absent' | 'active' | 'soft' | 'completed' | 'exited';
  phase: string;
  version: number;
  title: string;
  lines: string[];
  feedback: string[];
  actions: { label: string; command: string }[];
  choiceBound?: boolean;
  branchMenu?: OnboardingBranchMenu;
  entries?: { label: string; command: string }[];
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
    (row.branchMenu !== undefined &&
      (!row.branchMenu ||
        typeof row.branchMenu !== 'object' ||
        Array.isArray(row.branchMenu) ||
        !lines((row.branchMenu as OnboardingBranchMenu).lines) ||
        !Array.isArray((row.branchMenu as OnboardingBranchMenu).items) ||
        (row.branchMenu as OnboardingBranchMenu).items.length > 128 ||
        !(row.branchMenu as OnboardingBranchMenu).items.every(
          item => item &&
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            typeof item.description === 'string' &&
            typeof item.command === 'string' &&
            [...item.command].length <= 80 &&
            typeof item.learned === 'boolean'
        ))) ||
    (row.entries !== undefined &&
      (!Array.isArray(row.entries) ||
        row.entries.length > 2 ||
        !row.entries.every(entry => entry && typeof entry.label === 'string' && typeof entry.command === 'string' && [...entry.command].length <= 80))) ||
    !Array.isArray(row.actions) ||
    row.actions.length > 2 ||
    !row.actions.every(action => action && typeof action === 'object' && typeof action.label === 'string' && typeof action.command === 'string')
  ) {
    throw new Error('教学状态字段不完整');
  }

  return row as OnboardingView;
}
