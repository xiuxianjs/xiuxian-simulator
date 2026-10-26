export type GiftPillType = 'peiyuan' | 'zhuji';
export const parseTeachMasterCommand = (messageText: string): string | null => (messageText?.trim() ?? '').match(/^[!！/#＃]?传功\s+(.+)$/)?.[1]?.trim() ?? null;
export const parseBlessMasterCommand = (messageText: string): string | null => (messageText?.trim() ?? '').match(/^[!！/#＃]?赐福\s+(.+)$/)?.[1]?.trim() ?? null;
export const parseExpelMasterCommand = (messageText: string): string | null => (messageText?.trim() ?? '').match(/^[!！/#＃]?逐出师门\s+(.+)$/)?.[1]?.trim() ?? null;
export const parseApplyMasterCommand = (messageText: string): string | null => (messageText?.trim() ?? '').match(/^[!！/#＃]?拜师\s+(.+)$/)?.[1]?.trim() ?? null;
export const parseMasterGiftCommand = (messageText: string): { discipleArg: string; pillType?: GiftPillType } | null => {
  const raw = (messageText?.trim() ?? '').match(/^[!！/#＃]?赐丹(?:\s+([\s\S]*))?$/)?.[1]?.trim() ?? '';

  if (!raw) {
    return null;
  }
  const parts = raw.split(/\s+/).filter(Boolean);
  const last = parts.at(-1);
  const pillType = last === '筑基丹' ? 'zhuji' : last === '培元丹' ? 'peiyuan' : undefined;

  if (pillType) {
    parts.pop();
  }
  const discipleArg = parts.join(' ').trim();

  return discipleArg ? { discipleArg, pillType } : null;
};

export async function masterMentionBid(mention: {
  findOne: () => Promise<{ count?: number; data?: { UserId?: string | null } | null }>;
}): Promise<string | undefined> {
  const user = await mention.findOne();

  return user?.count && user.data?.UserId ? user.data.UserId : undefined;
}
