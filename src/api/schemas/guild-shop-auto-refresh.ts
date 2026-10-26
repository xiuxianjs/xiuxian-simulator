export type GuildLeadershipFacts = { isLeader: boolean; isViceLeader: boolean };
export type GuildShopAutoRefreshData = GuildLeadershipFacts & {
  outcome: 'not_joined' | 'denied' | 'shop_missing' | 'ready' | 'updated';
  enabled: boolean;
  hours: number[];
  version: string;
};
