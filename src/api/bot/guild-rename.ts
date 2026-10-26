import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { GuildRenameResult } from '../schemas/guild-rename';

export async function renameBackendGuild(bid: string | undefined, uid: number, name: string, request?: BackendRequestContext): Promise<GuildRenameResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const data = await requestBackend(bid, 'post_players_id_guild_rename', { path: { id: uid }, body: { name }, ...writeContext(request) });

  return parseGuildRename(data);
}

export function parseGuildRename(value: unknown): GuildRenameResult {
  const data = value as GuildRenameResult | null;

  if (
    !data ||
    ![
      'renamed',
      'too_short',
      'too_long',
      'invalid_characters',
      'inappropriate',
      'name_taken',
      'not_joined',
      'permission_denied',
      'rename_card_missing',
      'rename_card_insufficient'
    ].includes(data.outcome) ||
    (data.guildName !== null && typeof data.guildName !== 'string')
  ) {
    throw new Error('宗门改名响应不完整');
  }

  return data;
}
