export interface GuildRoleOptionsQueryData {
  membershipStatus: 'not_joined' | 'guild_missing' | 'members_missing' | 'joined';
  guildName: string;
  members: Array<{
    userId: number;
    name: string | null;
    userExists: boolean;
    realmName: string | null;
    roleName: string | null;
    isDeputy: boolean;
    appointableRoles: Array<{ id: number; name: string }>;
  }>;
  kickableMembers: Array<{ userId: number; name: string | null; userExists: boolean; realmName: string | null; roleName: string | null; isDeputy: boolean }>;
  roles: Array<{ id: number; name: string }>;
}
