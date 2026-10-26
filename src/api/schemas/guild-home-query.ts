export interface GuildHomeMembership {
  guildId: number;
  guildName: string | null;
  roleName: string | null;
  isDeputy: boolean;
  canUpgrade: boolean;
  isLeader: boolean;
}

export interface GuildHomeGuild {
  level: number;
  leader: { userId: number; name: string | null };
  spiritStone: number;
  spiritStoneCap: number;
  prestige: number;
  prestigeCap: number;
  veinLevel: number | null;
  shopLevel: number | null;
  viceLeaderCount: number;
  viceLeaderLimit: number;
  elderCount: number;
  elderLimit: number;
  memberCount: number;
  memberCapacity: number;
  minRealmName: string | null;
  notice: string | null;
  titles: string[];
  shopAutoRefresh: { enabled: boolean; hours: number[] };
}

export interface GuildHomeQueryData {
  hasGuild: boolean;
  access: { canCreateOrApplyGuild: boolean; canCreateGuild?: boolean };
  membership: GuildHomeMembership | null;
  guild: GuildHomeGuild | null;
  unlockLevels: { shop: number | null; viceLeader: number | null; elder: number | null };
  pendingApplications: number;
  storyline: { initialized: boolean; allCleared: boolean; stageIndex: number | null };
}
