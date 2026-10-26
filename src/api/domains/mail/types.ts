import type { FlyMailMuteContext, FlyMailMuteStateResult } from '../../schemas/flymail-mute';
import type { FlyMailHomeQueryData } from '../../schemas/fly-mail-query';
// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export interface MailOperations {
  get_players_id_flymail_mute_context: {
    path: { id: number };
    query: { targetBid?: string };
    headers: never;
    body: never;
    response: FlyMailMuteContext;
  };
  get_players_id_flymail: {
    path: { id: number };
    query: { scope?: string; page?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: FlyMailHomeQueryData;
  };
  post_players_id_flymail: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { content: string; scope: string; targetUid?: number };
    response: unknown;
  };
  get_players_id_flymail_mutes: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_flymail_mutes_targetId: {
    path: { id: number; targetId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: FlyMailMuteStateResult;
  };
  delete_players_id_flymail_mutes_targetId: {
    path: { id: number; targetId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: FlyMailMuteStateResult;
  };
  get_players_id_flymail_conversations: {
    path: { id: number };
    query: { scope: 'world' | 'friend' | 'companion' | 'master' | 'guild' | 'team' };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_flymail_directory: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_players_id_flymail_conversations_conversationId_messages: {
    path: { id: number; conversationId: number };
    query: { beforeMessageId?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_flymail_messages: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { scope: 'world' | 'friend' | 'companion' | 'master' | 'guild' | 'team'; targetUid?: number; content: string; clientMessageId: string };
    response: unknown;
  };
  get_players_id_flymail_stream: { path: { id: number }; query: never; headers: never; body: never; response: unknown };
  get_players_id_flymail_summary: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_flymail_conversations_conversationId_read: {
    path: { id: number; conversationId: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
}
