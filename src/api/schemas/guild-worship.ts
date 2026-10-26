export type GuildWorshipOffer = '灵石' | '灵晶' | '道晶';

/** Authoritative settlement returned after a guild ancestor worship. */
export interface GuildWorshipData {
  guildId: number;
  offer: GuildWorshipOffer;
  cost: number;
  dailyActivityAdded: number;
  currentDailyActivity: number;
  contributionAdded: number;
  message: string;
  offerText: string;
  dailyActivityText: string;
  contributionText: string;
}
