// Shared by route registration and routing tests, so detail paths cannot drift.
export const forgeReadEntries = ['我的锻造', '锻造指引'] as const;
export const forgeReadCommands = ['锻造图纸详情', '锻造记录详情', '锻造委托详情', '锻造图纸', '锻造记录', '锻造委托'] as const;
export const forgeReadRoutes = forgeReadCommands.map(path => ({
  path,
  schema: { args: [{ name: 'arguments', rules: [{ type: 'rest' as const }] }] }
}));
