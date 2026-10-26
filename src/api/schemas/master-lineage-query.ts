export interface MasterLineageNodeData {
  userId: number;
  name: string | null;
  realmName: string | null;
  relationStatus: 1 | 2 | null;
  disciples: MasterLineageNodeData[];
}
export interface MasterLineageQueryData {
  root: MasterLineageNodeData | null;
}
