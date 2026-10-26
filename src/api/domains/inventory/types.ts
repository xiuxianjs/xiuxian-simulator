import type { StorageLockRequest, StorageLockResult } from '../../schemas/storage-lock';
// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { Schemas } from '../../schemas/index.js';

export interface InventoryOperations {
  post_players_id_mingwu_dan_confirm: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { skillBookId: number; quantity: number };
    response: { message: string; proficiencyGain: number; currentProficiency: number; skillBookName: string; remainingCount: number; consumedCount: number };
  };
  post_players_id_consume: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { itemName?: string; itemId?: number; storageId?: number; pillOnly?: boolean; quantity: number };
    response: { outcome: string; message: string; remainingQuantity?: number; pending?: unknown };
  };
  post_players_id_storage_lock_state: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: StorageLockRequest;
    response: StorageLockResult;
  };
  get_players_id_currencies: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: Schemas['PlayerCurrencyBalances'];
  };
  get_players_id_inventory: {
    path: { id: number };
    query: { view?: 'bag'; subtype?: string; category: 'prop' | 'material'; page?: number; pageSize?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: Schemas['InventoryPage'] | Schemas['BotInventoryPage'];
  };
  get_players_id_inventory_space: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: Schemas['InventorySpace'];
  };
}
