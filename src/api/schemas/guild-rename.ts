export interface GuildRenameResult {
  outcome:
    | 'renamed'
    | 'too_short'
    | 'too_long'
    | 'invalid_characters'
    | 'inappropriate'
    | 'name_taken'
    | 'not_joined'
    | 'permission_denied'
    | 'rename_card_missing'
    | 'rename_card_insufficient';
  guildName: string | null;
}
