import type { LootboxListItem } from '@src/api/schemas/queries';

type GuiAction = { label: string; command: string };

/**
 * The server authorizes every open option. This adapter only turns the
 * returned request facts into commands understood by the chat platform.
 */
export function lootboxActions(lootbox: LootboxListItem): GuiAction[] {
  return lootbox.capabilities.flatMap(capability => {
    if (!capability.valid) {
      return [];
    }

    return capability.options.map(option => ({
      label:
        option.effectiveCount === option.requestedCount ? `开启 x${option.effectiveCount}` : `开启 x${option.requestedCount}（本次 x${option.effectiveCount}）`,
      command: `/开启礼盒 ${lootbox.lootboxId} ${option.requestedCount}`
    }));
  });
}
