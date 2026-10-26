export interface ThemeQueryData {
  themes: Array<{ id: number; name: string; source: 'system' | 'custom'; config: string; isActive: boolean; sortOrder: number }>;
  permission: { canCustomEdit: boolean; maxCustomSlots: number; requiredVipLevel?: number };
}
