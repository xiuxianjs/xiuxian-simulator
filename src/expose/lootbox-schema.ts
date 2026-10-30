import { integer, list, object, text } from './schema';

export const lootboxSelection = object({
  kind: { type: 'string', enum: ['treasure'] },
  rarity: { type: 'string', enum: ['rare', 'epic', 'mythic'] },
  choices: list(object({ treasureId: integer, name: text, rarity: text }))
});

export const lootboxOpenResult = object({
  lootboxId: integer,
  lootboxName: text,
  openCount: integer,
  rewards: list(object({ category: text, rewardId: integer, name: text, quantity: integer })),
  selection: lootboxSelection
}, ['lootboxId', 'selection']);
