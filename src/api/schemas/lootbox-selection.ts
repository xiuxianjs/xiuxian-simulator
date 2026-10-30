export interface LootboxTreasureSelection {
  kind: 'treasure';
  rarity: 'rare' | 'epic' | 'mythic';
  choices: { treasureId: number; name: string; rarity: 'rare' | 'epic' | 'mythic' }[];
}

/** Selection comes from the server; owned treasures remain valid choices. */
export function parseLootboxSelection(value: unknown): LootboxTreasureSelection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宝盒自选内容不完整');
  }
  const selection = value as Record<string, unknown>;

  if (selection.kind !== 'treasure' || !['rare', 'epic', 'mythic'].includes(String(selection.rarity)) || !Array.isArray(selection.choices) || !selection.choices.length) {
    throw new Error('宝盒自选内容不完整');
  }
  const rarity = selection.rarity as LootboxTreasureSelection['rarity'];
  const seen = new Set<number>();
  const choices = selection.choices.map(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('宝盒自选宝物不完整');
    }
    const choice = value as Record<string, unknown>;
    const treasureId = choice.treasureId;

    if (typeof treasureId !== 'number' || !Number.isSafeInteger(treasureId) || treasureId < 1 || seen.has(treasureId) || typeof choice.name !== 'string' || !choice.name.trim() || choice.rarity !== rarity) {
      throw new Error('宝盒自选宝物不完整');
    }
    seen.add(treasureId);

    return { treasureId, name: choice.name, rarity };
  });

  return { kind: 'treasure', rarity, choices };
}
