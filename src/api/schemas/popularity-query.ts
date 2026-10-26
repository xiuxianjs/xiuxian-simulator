export interface PopularityQueryEntry {
  rank: number;
  uid: number;
  name: string;
  popularity: number;
}
export interface PopularityQueryPage {
  canUseFifthLayerFeature: boolean;
  realmName: string | null;
  items: PopularityQueryEntry[];
  self: PopularityQueryEntry | null;
  nearby: PopularityQueryEntry[];
}
