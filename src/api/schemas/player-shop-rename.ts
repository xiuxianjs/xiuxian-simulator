export type PlayerShopRenameResult =
  { outcome: 'renamed'; name: string } | { outcome: 'empty' | 'too_short' | 'too_long' | 'invalid_characters' | 'name_taken'; name: null };
