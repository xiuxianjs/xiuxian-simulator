export type CaptchaVerifyResult = {
  outcome: 'not_pending' | 'pending' | 'passed' | 'failed' | 'muted';
  failureCount: number;
  remainingAttempts: number;
  passedTtlSeconds: number;
  muteCount: number;
  muteTtlSeconds: number;
  muteUnlockTime: string;
};
export type CaptchaOperationClaimResult = {
  checksDisabled: boolean;
  challengeRequired: boolean;
  operationCount: number;
  operationLimit: number;
  passedTtlSeconds: number;
};
export type CaptchaChallengeResult = { svg: string; captchaTtlSeconds: number };
export type CaptchaMuteReplyClaimResult = {
  muted: boolean;
  claimed: boolean;
  replyCount: number;
  muteTtlSeconds: number;
  replyTtlSeconds: number;
  muteUnlockTime: string;
};
