export interface GuildMyRedPacketsQueryData {
  hasGuild: boolean;
  guildName: string | null;
  packets: Array<{
    id: number;
    currencyType: string;
    packetCount: number;
    perAmount: number;
    status: number;
    claimedCount: number;
    recycled: number;
    expiresAt: string | null;
    currencyName: string;
    statusText: string;
    canRecycle: boolean;
    recycleAmount: number;
  }>;
}
