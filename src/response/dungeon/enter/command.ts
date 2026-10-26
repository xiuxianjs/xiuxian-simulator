type ParsedDungeonCommand = { ok: true; dungeonName: string } | { ok: false; isCommand: boolean; message: string };
export function parseDungeonCommand(messageText: string): ParsedDungeonCommand {
  const cleaned = (messageText ?? '').trim().replace(/^(!|！|\/|#|＃)?\s*/, '');

  if (!cleaned.startsWith('秘境挑战')) {
    return { ok: false, isCommand: false, message: '' };
  }
  const dungeonName = cleaned.slice('秘境挑战'.length).trim();

  return dungeonName ? { ok: true, dungeonName } : { ok: false, isCommand: true, message: '请输入秘境名称' };
}
