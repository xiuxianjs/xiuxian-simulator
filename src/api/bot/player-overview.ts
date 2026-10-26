import { getCurrentEvent } from 'alemonjs';
import { getEventAccessFacts } from './access-facts';
import { requestBackend } from './client';
import type { HomeOverviewData } from '../schemas/player-overview';
import type { BackendRequestContext } from './context';
import { validatePlayerProfile } from './player-profile-query';
import { validateHomeNotifications } from './home-notification-queries';
import { validatePlayerPreferences } from './player-preferences-queries';
import { validateGroupSubscription } from './group-subscription-queries';
export async function getBackendHomeOverview(bid: string, uid: number, request?: BackendRequestContext) {
  const facts = getEventAccessFacts(getCurrentEvent(), bid, uid);

  if (facts?.homeOverview !== undefined) {
    try {
      return validateHomeOverview(facts.homeOverview, uid);
    } catch {
      // Optional transport facts never replace the authoritative endpoint on
      // older or incomplete responses. Reuse only a fully validated snapshot.
    }
  }
  const receipt = facts?.resourceSettlement;
  const data = await requestBackend(bid, 'post_players_id_home_overview', {
    path: { id: uid },
    requestId: request?.requestId,
    ...(receipt ? { headers: { 'X-Command-Resource-Receipt': receipt } } : {})
  });

  return validateHomeOverview(data, uid);
}

export function validateHomeOverview(data: HomeOverviewData, uid?: number): HomeOverviewData {
  const profile = validatePlayerProfile(data.profile);

  if (uid !== undefined && profile.found && profile.user?.id !== uid) {
    throw new Error('主页资料身份不匹配');
  }
  const notifications = validateHomeNotifications(data.notifications);
  const atmosphere = data.atmosphere;

  if (
    profile.found &&
    (!atmosphere ||
      (atmosphere.text !== null && typeof atmosphere.text !== 'string') ||
      !['absence', 'ambience', 'none'].includes(atmosphere.kind) ||
      (atmosphere.kind === 'none') !== (atmosphere.text === null))
  ) {
    throw new Error('主页氛围响应不完整');
  }

  if (data.guildName !== undefined && data.guildName !== null && typeof data.guildName !== 'string') {
    throw new Error('主页宗门响应不完整');
  }

  return { profile, notifications, atmosphere, ...(data.guildName !== undefined ? { guildName: data.guildName } : {}) };
}
export async function getBackendSettingsOverview(bid: string | undefined, uid: number, includeGroup: boolean) {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const data = await requestBackend(bid, 'get_players_id_settings_overview', { path: { id: uid }, query: { includeGroup } });

  return validateSettingsOverview(data);
}

export function validateSettingsOverview(data: unknown) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('设置数据不完整');
  }
  const row = data as Record<string, unknown>;

  return { preferences: validatePlayerPreferences(row.preferences), subscription: validateGroupSubscription(row.subscription) };
}
