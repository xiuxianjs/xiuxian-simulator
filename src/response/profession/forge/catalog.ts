import type { ForgeOverview } from '@src/api/schemas/forge';

export type ForgeCatalogFilter = '全部' | '考核' | '可制作';
export type ForgeCatalogQuery = { filter: ForgeCatalogFilter; page: number };

// Keep the existing numeric page form, while making growth filters explicit.
export function parseForgeCatalogArguments(args: readonly string[]): ForgeCatalogQuery | null {
  const filters = ['全部', '考核', '可制作'] as const;
  const filtered = filters.some(filter => filter === args[0]);
  const filter = filtered ? (args[0] as ForgeCatalogFilter) : '全部';
  const pages = filtered ? args.slice(1) : args;

  if (pages.length > 1 || (pages.length === 1 && !/^\d+$/.test(pages[0]))) {
    return null;
  }
  const page = pages.length ? Number(pages[0]) : 1;

  return Number.isSafeInteger(page) && page > 0 ? { filter, page } : null;
}

export function forgeRecipesForFilter(overview: ForgeOverview, filter: ForgeCatalogFilter) {
  if (filter === '可制作') {
    return overview.recipes.filter(recipe => recipe.canCraft);
  }
  if (filter === '考核') {
    return overview.joined ? overview.recipes.filter(recipe => recipe.requiredLevel === overview.level && recipe.assessment && !recipe.completed) : [];
  }

  return overview.recipes;
}

export function forgeCatalogCommand(query: ForgeCatalogQuery): string {
  return `/锻造图纸 ${query.filter} ${query.page}`;
}
