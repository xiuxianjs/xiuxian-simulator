export interface EncyclopediaListItem {
  id: number;
  name: string;
  gradeName: string;
  detailCategory: string;
}

export interface EncyclopediaListPage {
  items: EncyclopediaListItem[];
  page: { totalCount: number; totalPages: number; page: number; pageSize: number };
}

export interface EncyclopediaListCursor {
  items: EncyclopediaListItem[];
  nextCursor?: string;
}

/** Raw game configuration used by the existing encyclopedia renderers. */
export interface EncyclopediaSourceFacts {
  stages: { probability: number; chapterId: number | null; chapterName: string | null; stageLabel: string | null; isElite: boolean | null }[];
  dungeons: { probability: number; dungeonName: string | null }[];
  recipes: { id: number; name: string; pillItemId: number; inferiorPillItemId: number | null }[];
  shops: { shopCode: string; priceAmount: number; priceCurrencyCode: string }[];
  guildShop: { priceContribution: number }[];
  materials: { recipeId: number; recipeName: string }[];
}

export interface EncyclopediaDetailFacts {
  view: Array<{ kind: 'text' | 'newline' | 'quote' | 'source'; text?: string; command?: string }>;
  sources: EncyclopediaSourceFacts;
  lore: { gameplay?: string | null; lore?: string | null } | null;
  equipmentSet: { name: string } | null;
  setEffects: Record<string, unknown>[];
}
