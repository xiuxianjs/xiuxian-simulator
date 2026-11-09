type ParsedDungeonCommand = { ok: true; dungeonName: string } | { ok: true; dungeonId: number } | { ok: false; isCommand: boolean; message: string };
export function parseDungeonCommand(messageText: string): ParsedDungeonCommand {
  const cleaned = (messageText ?? '').trim().replace(/^(!|！|\/|#|＃)?\s*/, '');

  if (!cleaned.startsWith('秘境挑战')) {
    return { ok: false, isCommand: false, message: '' };
  }
  const dungeonName = cleaned.slice('秘境挑战'.length).trim();

  if (/^#\d+$/.test(dungeonName)) {
    const dungeonId = Number(dungeonName.slice(1));

    return Number.isSafeInteger(dungeonId) && dungeonId > 0 ? { ok: true, dungeonId } : { ok: false, isCommand: true, message: '秘境编号无效' };
  }

  return dungeonName ? { ok: true, dungeonName } : { ok: false, isCommand: true, message: '请输入秘境名称' };
}
