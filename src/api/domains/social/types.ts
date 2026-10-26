import type { FriendWorkflowInput, FriendWorkflowResult } from '../../schemas/social-workflows';
import type { FriendRequestRejectResult } from '../../schemas/friend-request-reject';
import type { FriendRemovalTargetData, DeleteFriendResult } from '../../schemas/friend-removal';
import type { FriendRequestPreferenceData } from '../../schemas/friend-settings';
import type { BlocklistRemovalSelector, BlocklistRemovalResult } from '../../schemas/blocklist-removal';
import type { BlockUserByNameResult } from '../../schemas/block-user-by-name';
import type { RandomFriendQueryData } from '../../schemas/random-friend-query';
import type { SocialAccessData, FriendListData } from '../../schemas/queries';
import type { FriendRequestMutationResult } from '../../schemas/friend-request-mutation';
// Contract synchronized with Go docs/openapi.yaml.
// Unspecified domain payloads intentionally remain unknown.

export interface SocialOperations {
  post_players_id_flymail_mute_command: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key'?: string };
    body: { targetUid?: number; targetBid?: string; muted: boolean };
    response: unknown;
  };
  post_players_id_friends_workflow: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: FriendWorkflowInput;
    response: FriendWorkflowResult;
  };
  post_players_id_blocklist_by_name: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: { targetName: string };
    response: BlockUserByNameResult;
  };
  post_players_id_friend_requests_requestId_reject: {
    path: { id: number; requestId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: FriendRequestRejectResult;
  };
  get_players_id_friends_removal_target: {
    path: { id: number };
    query: { targetUid: string; targetBid?: never } | { targetBid: string; targetUid?: never };
    headers: never;
    body: never;
    response: FriendRemovalTargetData;
  };
  get_players_id_friend_request_preference: { path: { id: number }; query: never; headers: never; body: never; response: FriendRequestPreferenceData };
  patch_players_id_friend_request_preference: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: { friendRequestEnabled: boolean };
    response: FriendRequestPreferenceData;
  };
  post_players_id_blocklist_removal: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: BlocklistRemovalSelector;
    response: BlocklistRemovalResult;
  };
  get_players_id_friends_random: {
    path: { id: number };
    query: never;
    headers: never;
    body: never;
    response: RandomFriendQueryData;
  };
  get_players_id_social_access: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: SocialAccessData };
  get_players_id_friends: {
    path: { id: number };
    query: { page?: number; pageSize?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: FriendListData;
  };
  get_players_id_friend_requests: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_friend_requests: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { toUserId: number; message?: string };
    response: FriendRequestMutationResult;
  };
  post_players_id_friend_requests_requestId_accept: {
    path: { id: number; requestId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: FriendRequestMutationResult;
  };
  delete_players_id_friends_friendId: {
    path: { id: number; friendId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: DeleteFriendResult;
  };
  get_players_id_blocklist: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_blocklist: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { blockedUserId: number };
    response: unknown;
  };
  delete_players_id_blocklist_blockedUserId: {
    path: { id: number; blockedUserId: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
}
