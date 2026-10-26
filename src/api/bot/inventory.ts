import type { Schemas } from '../schemas';
import type { BackendRequestContext } from './context';
import { requestBackend } from './client';

export type BackendInventoryPage = Schemas['BotInventoryPage'];

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
const identifier = (value: unknown): value is number => integer(value) && value >= 0;
const gradeReference = (value: unknown): boolean => value === null || (record(value) && identifier(value.id) && typeof value.name === 'string' && identifier(value.realmId));
const realmReference = (value: unknown): boolean => value === null || (record(value) && identifier(value.id) && typeof value.name === 'string' && integer(value.level));
const inventoryCapability = (value: unknown): boolean => record(value) &&
  typeof value.kind === 'string' &&
  (value.recipeId === undefined ? value.kind !== 'viewRecipe' : identifier(value.recipeId) && value.recipeId > 0);

/** Reject incomplete data contracts instead of supplementing them from Node models. */
export async function getBackendInventory(
  bid: string,
  uid: number,
  query: { category: 'prop' | 'material'; subtype?: string; page: number },
  request?: BackendRequestContext
): Promise<BackendInventoryPage> {
  const data = await requestBackend(bid, 'get_players_id_inventory', { path: { id: uid }, query: { ...query, view: 'bag' }, requestId: request?.requestId });

  return parseBackendInventory(data);
}

export function parseBackendInventory(value: unknown): BackendInventoryPage {
  if (
    !record(value) ||
    typeof value.activeSubcategory !== 'string' ||
    !record(value.pagination) ||
    !Array.isArray(value.items) ||
    !Array.isArray(value.capabilities) ||
    !integer(value.playerStageLevel) ||
    ![value.pagination.page, value.pagination.pageSize, value.pagination.total, value.pagination.totalPages].every(identifier) ||
    Number(value.pagination.page) < 1 ||
    Number(value.pagination.pageSize) < 1 ||
    !value.capabilities.every(inventoryCapability) ||
    !value.items.every(
      item => record(item) &&
        identifier(item.id) &&
        identifier(item.userItemId) &&
        identifier(item.itemId) &&
        typeof item.name === 'string' &&
        typeof item.type === 'string' &&
        (item.subtype === null || typeof item.subtype === 'string') &&
        integer(item.quantity) &&
        integer(item.listedQuantity) &&
        integer(item.stackMax) &&
        integer(item.permission) &&
        typeof item.isStackable === 'boolean' &&
        (integer(item.isLocked) || typeof item.isLocked === 'boolean') &&
        gradeReference(item.grade) &&
        realmReference(item.realm) &&
        Object.hasOwn(item, 'effect') &&
        Array.isArray(item.capabilities) &&
        item.capabilities.every(inventoryCapability)
    )
  ) {
    throw new Error('背包接口返回不完整，请更新服务端后重试');
  }

  return value as BackendInventoryPage;
}

export function parseRobotStorageBag(value: unknown) {
  const remote = parseBackendInventory(value);

  return {
    activeSubcategory: remote.activeSubcategory,
    page: remote.pagination.page,
    total: remote.pagination.total,
    pageSize: remote.pagination.pageSize,
    items: remote.items,
    capabilities: remote.capabilities
  };
}

export function parseRobotStorageMenu(value: unknown): { message: string } {
  if (!record(value) || typeof value.message !== 'string') {
    throw new Error('储物袋菜单响应不完整');
  }

  return { message: value.message };
}
