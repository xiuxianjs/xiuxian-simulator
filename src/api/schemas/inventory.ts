// Contract synchronized with Go docs/openapi.yaml.
// Unspecified domain payloads intentionally remain unknown.
import type { Schemas } from './index.js';

export interface InventorySchemas {
  InventoryItem: {
    userItemId: number;
    itemId: number;
    name: string;
    type: string;
    subtype: string | null;
    quantity: number;
    listedQuantity: number;
    isLocked: number;
    stackMax: number;
    permission: number;
  };
  InventoryPagination: { page: number; pageSize: number; total: number; totalPages: number };
  InventoryPage: { items: Array<Schemas['InventoryItem']>; pagination: Schemas['InventoryPagination'] };
  InventoryGrade: { id: number; name: string; realmId: number } | null;
  InventoryRealm: { id: number; name: string; level: number } | null;
  /** A server-authorized entry point. The robot maps it to its platform command. */
  InventoryCapability: { kind: string; recipeId?: number };
  BotInventoryItem: {
    id: number;
    userItemId: number;
    itemId: number;
    name: string;
    type: string;
    subtype: string | null;
    quantity: number;
    listedQuantity: number;
    isLocked: number;
    stackMax: number;
    permission: number;
    isStackable: boolean;
    grade: Schemas['InventoryGrade'];
    realm: Schemas['InventoryRealm'];
    effect: unknown;
    capabilities: Array<Schemas['InventoryCapability']>;
  };
  BotInventoryPage: {
    items: Array<Schemas['BotInventoryItem']>;
    pagination: Schemas['InventoryPagination'];
    activeSubcategory: string;
    playerStageLevel: number;
    capabilities: Array<Schemas['InventoryCapability']>;
  };
  InventorySpace: { usedSpace: number; totalCapacity: number; remainingSpace: number };
}
