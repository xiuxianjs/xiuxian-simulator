import type { RobotMiddlewareInput, RobotMiddlewareResult } from '../../bot/middleware-entry';
import type { RobotCommandEntryResult, RobotCommandProfile } from '../../bot/command-entry';
// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { Schemas } from '../../schemas/index.js';

export interface AuthOperations {
  post_v2_robot_business_operation: AuthOperations['post_robot_business_operation'];
  post_v2_robot_home_overview: AuthOperations['post_robot_home_overview'];
  post_robot_business_operation: {
    path: { operation: import('../../bot/robot-business').RobotBusinessOperation };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string };
    body: RobotMiddlewareInput & { arguments: Record<string, unknown> };
    response: unknown;
  };
  post_robot_home_overview: {
    path: never;
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string };
    body: RobotMiddlewareInput;
    response: unknown;
  };
  post_robot_middleware_entry: {
    path: never;
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string };
    body: RobotMiddlewareInput;
    response: RobotMiddlewareResult;
  };
  post_robot_command_entry: {
    path: never;
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string };
    body: RobotCommandProfile & { messageText: string };
    response: RobotCommandEntryResult;
  };
  getRobotIdentity: { path: never; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: Schemas['RobotIdentityView'] };
  post_auth_email_verifications: {
    path: never;
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: { type: 'bind' | 'changeEmail' | 'change'; value: string };
    response: Schemas['EmailVerificationBegin'];
  };
  post_auth_email_verifications_type_confirm: {
    path: { type: 'bind' | 'changeEmail' | 'change' };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { code: string };
    response: Schemas['EmailVerificationConfirm'];
  };
  put_auth_password: { path: never; query: never; headers: { 'Idempotency-Key'?: string }; body: { password: string }; response: unknown };
  put_players_id_auth_password: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { password: string };
    response: Schemas['RobotPassword'];
  };
  post_players_id_auth_temporary_password: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: { playerId: number; email?: string; temporaryPassword: string; expiresAt: string; expiresIn: number };
  };
  get_auth_profile: { path: never; query: never; headers: never; body: never; response: Schemas['AuthProfile'] };
  delete_auth_sessions_sessionId: { path: { sessionId: string }; query: never; headers: { 'Idempotency-Key'?: string }; body: never; response: unknown };
  post_auth_sessions_revoke_others: { path: never; query: never; headers: { 'Idempotency-Key'?: string }; body: never; response: unknown };
  post_auth_login: {
    path: never;
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { uid: number; password: string } & ({ email: string; temporaryPassword?: never } | { temporaryPassword: string; email?: never });
    response: Schemas['Tokens'];
  };
  post_auth_refresh: {
    path: never;
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { refreshToken: string };
    response: Schemas['Tokens'];
  };
  post_auth_logout: { path: never; query: never; headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string }; body: never; response: unknown };
  get_auth_sessions: { path: never; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
}
