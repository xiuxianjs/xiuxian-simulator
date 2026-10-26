export type GuildBattleTrainingBranch = '团队' | '个人';
export type GuildBattleTrainingKey = '攻' | '守' | '血' | '速' | '命' | '会';

export interface GuildBattleTrainingLine {
  key: GuildBattleTrainingKey;
  name: string;
  level: number;
  maxLevel: number;
  effectText: string;
  nextCostPrestige: number | null;
  nextCostSpiritStone: number | null;
  nextCostContribution: number | null;
}

export interface GuildBattleTrainingState {
  guildId: number;
  guildName: string;
  guildLevel: number;
  prestige: number;
  spiritStone: number;
  contributionPoints: number;
  unlocked: boolean;
  teamMaxLevel: number;
  personalMaxLevel: number;
  canUpgradeTeam: boolean;
  team: GuildBattleTrainingLine[];
  personal: GuildBattleTrainingLine[];
}

export interface GuildBattleTrainingUpgradeResult {
  branch: GuildBattleTrainingBranch;
  key: GuildBattleTrainingKey;
  name: string;
  newLevel: number;
  effectText: string;
  costText: string;
  contributionPoints: number | null;
  prestige: number | null;
  spiritStone: number | null;
}
