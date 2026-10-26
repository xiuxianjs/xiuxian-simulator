export interface GuildRedPacketQueryItem {
  id: number;
  currencyType: string;
  packetCount: number;
  perAmount: number;
  claimedCount: number;
  expiresAt: string | null;
  currencyName: string;
  remaining: number;
  remainingTimeText: string;
}
export interface GuildRedPacketsQueryData {
  hasGuild: boolean;
  guildName: string | null;
  packets: GuildRedPacketQueryItem[];
}
