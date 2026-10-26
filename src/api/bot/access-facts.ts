import { invalidatePresentationAccess } from './presentation-access-state';
import { invalidateEventCatalog } from './catalog-query-reuse';
import type { HomeOverviewData } from '../schemas/player-overview';
import type { RealmAccessQuery } from '../schemas/realm-access-query';

export type CommandAccessFact = 'realm' | 'social' | 'resourceSettlement' | 'homeOverview';
export type CommandSocialAccessFact = {
  ok: boolean;
  realmName: string;
  realmNameValue: string | null;
  canUseSecondLayerFeature: boolean;
  canUseFifthLayerFeature: boolean;
  canUseSpar: boolean;
  canCreateOrApplyGuild: boolean;
};
export type CommandAccessFacts = {
  resourceSettlement?: string;
  homeOverview?: HomeOverviewData;
  realm?: RealmAccessQuery;
  social?: CommandSocialAccessFact;
};
const snapshots = new WeakMap<object, { bid: string; uid: number; facts: CommandAccessFacts }>();
const importerFacts = new WeakMap<object, CommandAccessFact[]>();

// Registration metadata only; this does not add a handler or load a response.
export function withAccessFacts<T extends () => Promise<unknown>>(facts: CommandAccessFact[], importer: T): T {
  importerFacts.set(importer, facts);

  return importer;
}
export function getRegisteredAccessFacts(importers: readonly object[]): CommandAccessFact[] {
  return [...new Set(importers.flatMap(importer => importerFacts.get(importer) ?? []))];
}
export function seedEventAccessFacts(event: object & { UserId?: string }, bid: string, uid: number, facts: CommandAccessFacts): void {
  if (event.UserId !== bid || !Number.isSafeInteger(uid) || uid < 1) {
    throw new Error('准入事实身份不匹配');
  }
  snapshots.set(event, { bid, uid, facts });
}
export function getEventAccessFacts(event: (object & { UserId?: string }) | undefined, bid: string, uid?: number): CommandAccessFacts | undefined {
  if (!event || event.UserId !== bid) {
    return;
  }
  const snapshot = snapshots.get(event);

  return snapshot?.bid === bid && (uid === undefined || snapshot.uid === uid) ? snapshot.facts : undefined;
}
export function invalidateEventAccessFacts(event: object): void {
  snapshots.delete(event);
  invalidatePresentationAccess(event);
  invalidateEventCatalog(event);
}
