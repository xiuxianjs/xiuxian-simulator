export interface ThemeActivateResult {
  outcome: 'activated' | 'not_found';
  id: number | null;
  name: string | null;
}
export interface ThemeDeactivateResult {
  removed: boolean;
}
