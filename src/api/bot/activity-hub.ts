export interface RobotActivityHub {
  limitedEvent: { activeCount: number };
  guildCompetition: { phase: string };
  guildSecretRealmWar: {
    phase: string;
    activeStartAt: string;
    activeEndAt: string;
    maxAttackPerWeek: number;
    remainingAttackCount: number;
    guild?: {
      name: string;
      outputBonusPct: number;
      occupation?: { source: string; top: number; high: number; low: number; total: number };
    } | null;
  };
  access: { hasGuild: boolean; canAccessOverseasIsland: boolean };
  overseasIsland?: 'ACTIVE' | 'INACTIVE' | 'UNKNOWN';
  overseasIslandRequiredRealm?: string;
  newcomerVisible: boolean;
  giftCodesVisible: boolean;
}

/** Decode the bubble projection; never fetch missing activity, catalog or realm data. */
export function parseRobotActivityHub(value: unknown): RobotActivityHub {
  const row = value as RobotActivityHub | null;
  const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n);

  if (
    !row ||
    !finite(row.limitedEvent?.activeCount) ||
    typeof row.guildCompetition?.phase !== 'string' ||
    typeof row.access?.hasGuild !== 'boolean' ||
    typeof row.access?.canAccessOverseasIsland !== 'boolean' ||
    typeof row.newcomerVisible !== 'boolean' ||
    typeof row.giftCodesVisible !== 'boolean'
  ) {
    throw new Error('活动总览响应不完整');
  }
  const war = row.guildSecretRealmWar;

  if (
    !war ||
    typeof war.phase !== 'string' ||
    typeof war.activeStartAt !== 'string' ||
    typeof war.activeEndAt !== 'string' ||
    !finite(war.maxAttackPerWeek) ||
    !finite(war.remainingAttackCount)
  ) {
    throw new Error('活动总览响应不完整');
  }
  if (war.guild) {
    if (typeof war.guild.name !== 'string' || !finite(war.guild.outputBonusPct)) {
      throw new Error('活动总览响应不完整');
    }
    const occupation = war.guild.occupation;

    if (occupation && (typeof occupation.source !== 'string' || ![occupation.top, occupation.high, occupation.low, occupation.total].every(finite))) {
      throw new Error('活动总览响应不完整');
    }
  }
  if (
    (row.access.canAccessOverseasIsland && !['ACTIVE', 'INACTIVE', 'UNKNOWN'].includes(row.overseasIsland ?? '')) ||
    (row.overseasIslandRequiredRealm !== undefined && typeof row.overseasIslandRequiredRealm !== 'string')
  ) {
    throw new Error('活动总览响应不完整');
  }

  return row;
}
