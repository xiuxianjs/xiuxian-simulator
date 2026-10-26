import type { CompanionTasksQueryData } from '../../schemas/companion-tasks-query';
import type { CompanionPanelStatusQueryData } from '../../schemas/companion-panel-status-query';
import type { CompanionInfoQueryData } from '../../schemas/companion-info-query';
import type { CompanionGiftOptionsQueryData, CompanionGiftTargetQueryData } from '../../schemas/companion-gift-preparation-query';
import type { CompanionGiftSettlement } from '../../schemas/companion-gift';
import type { GiftRecordPageData } from '../../schemas/queries';
// Contract maintained against Go docs/openapi.yaml; verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export interface PartnersOperations {
  post_players_id_companion_shop_purchases_preview: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: { productId: number; count: number };
    response: { productId: number; name: string; unitPrice: number; totalPrice: number; grantQuantity: number; count: number };
  };
  post_players_id_companion_shop_purchases: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { productId: number; count: number };
    response: { name: string; paid: string; granted: number; buyCount: number };
  };
  get_players_id_companion_proposal_preflight: {
    path: { id: number };
    query: { target?: string; page?: number; pageSize?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_companion_proposals: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_players_id_companion_gift_targets: {
    path: { id: number };
    query: { giftName?: string };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: CompanionGiftTargetQueryData;
  };
  get_players_id_companion_gift_options_targetId: {
    path: { id: number; targetId: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: CompanionGiftOptionsQueryData;
  };
  get_players_id_companion: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: CompanionInfoQueryData };
  delete_players_id_companion: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_companion_proposals: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { oathItemId: number; targetUserId: number };
    response: unknown;
  };
  post_players_id_companion_proposals_proposerId_accept: {
    path: { id: number; proposerId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_companion_proposals_proposerId_reject: {
    path: { id: number; proposerId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_companion_tasks: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: CompanionTasksQueryData };
  get_players_id_companion_panel_status: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: CompanionPanelStatusQueryData;
  };
  get_players_id_companion_oath_items: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_players_id_companion_oath_upgrade: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_companion_oath_upgrade: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_companion_dual_cultivation: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_companion_gifts: {
    path: { id: number };
    query: { page?: number; pageSize?: number; mode?: 'all' | 'send' | 'receive' };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: GiftRecordPageData;
  };
  post_players_id_companion_gifts: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { itemId?: number; giftName?: string; targetUserId: number };
    response: CompanionGiftSettlement;
  };
}
