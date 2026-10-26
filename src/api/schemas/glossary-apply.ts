export type GlossaryApplyResult = {
  outcome: 'submitted' | 'reason_too_long' | 'already_allowed' | 'pending' | 'player_missing' | 'realm_missing' | 'realm_locked';
};
