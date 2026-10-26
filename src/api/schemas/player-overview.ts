import type { PlayerProfileQueryData } from './player-profile-query';
import type { HomeNotificationQueryData } from './home-notification-query';
import type { PlayerPreferencesQueryData } from './player-preferences-query';
import type { GroupSubscriptionQueryData } from './group-subscription-query';
export type HomeOverviewData = {
  guildName?: string | null;
  profile: PlayerProfileQueryData;
  notifications: HomeNotificationQueryData;
  atmosphere: { text: string | null; kind: 'absence' | 'ambience' | 'none' } | null;
};
export type SettingsOverviewData = { preferences: PlayerPreferencesQueryData; subscription: GroupSubscriptionQueryData | null };
