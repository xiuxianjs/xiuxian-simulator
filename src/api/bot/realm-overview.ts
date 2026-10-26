import { requestBackend } from './client';
export async function getBackendRealmOverview(bid: string | undefined, uid: number): Promise<any> {
  if (!bid) {
    throw new Error('境界查询缺少平台身份');
  }

  return await requestBackend(bid, 'get_players_id_realm_overview', { path: { id: uid } });
}

export type RobotRealmOverview = {
  sections: Array<{ title: string; lines: string[] }>;
  canUseSoulPath: boolean;
  showBreakthrough: boolean;
  showPromotion: boolean;
  showTribulation: boolean;
};

export function parseRobotRealmOverview(value: unknown): RobotRealmOverview {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('境界展示响应不完整');
  }
  const data = value as Record<string, unknown>;
  const flags = ['canUseSoulPath', 'showBreakthrough', 'showPromotion', 'showTribulation'];

  if (!Array.isArray(data.sections) || !flags.every(key => typeof data[key] === 'boolean')) {
    throw new Error('境界展示响应不完整');
  }
  const sections = data.sections.map(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('境界展示响应不完整');
    }
    const section = value as Record<string, unknown>;

    if (typeof section.title !== 'string' || !Array.isArray(section.lines) || !section.lines.every(line => typeof line === 'string')) {
      throw new Error('境界展示响应不完整');
    }

    return { title: section.title, lines: section.lines };
  });

  return {
    sections,
    canUseSoulPath: data.canUseSoulPath as boolean,
    showBreakthrough: data.showBreakthrough as boolean,
    showPromotion: data.showPromotion as boolean,
    showTribulation: data.showTribulation as boolean
  };
}
