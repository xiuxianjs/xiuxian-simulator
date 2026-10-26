export interface PlayerProfileActionResult {
  action: 'rename' | 'gender' | 'signature';
  value: string;
  cleared: boolean;
}
