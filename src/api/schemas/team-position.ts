export type TeamPositionUpdateResult = {
  outcome: 'updated' | 'invalid_position' | 'not_in_team' | 'not_leader' | 'target_not_in_team' | 'same_position';
};
export type TeamPositionTargetData = { uid: number | null };
