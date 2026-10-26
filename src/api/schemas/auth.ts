// Auth schemas aligned with Go docs/openapi.yaml.
export interface AuthSchemas {
  AuthProfile: { playerId: number; name: string; email: string; hasPassword: boolean; emailChangeCount: number; previousEmail: string | null };
  RobotIdentityView: {
    bid: string;
    account: { status: 'registered'; playerId: number } | { status: 'unregistered'; playerId: null };
  };
  RobotPassword: { updated: true; playerId: number; bid: string; minLength: number };
  EmailVerificationBegin: { type: 'bind' | 'changeEmail' | 'change'; expiresIn: number; remainingToday: number; currentEmail?: string; targetName?: string };
  EmailVerificationConfirm:
    | { type: 'bind'; verified: true; email: string }
    | { type: 'changeEmail'; verified: true; oldEmail: string; newEmail: string }
    | { type: 'change'; verified: true; fromName: string; toName: string };
  Tokens: { accessToken: string; refreshToken: string; expiresAt: string; sessionId: string };
}
