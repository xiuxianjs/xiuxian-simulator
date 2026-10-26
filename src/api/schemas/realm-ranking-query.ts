export interface RealmRankingItem {
  rank: number;
  uid: number;
  name: string;
  realmName: string;
  realmLevel: number;
  experience: number;
}
export interface RealmRankingQueryData {
  canUseFifthLayerFeature: boolean;
  canUseSpar: boolean;
  realmName: string | null;
  region: string | null;
  list: RealmRankingItem[];
  self: RealmRankingItem | null;
  nearby: RealmRankingItem[];
}
