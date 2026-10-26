export type FlyMailScope = 'friend' | 'master' | 'guild' | 'companion' | 'team';
export interface FlyMailHomeQueryData {
  scope: FlyMailScope;
  page: number;
  total: number;
  totalPage: number;
  access: { allowed: boolean; realmName: string; realmLevel: number };
  muteList: Array<{ uid: number; name: string }>;
  list: Array<{
    kind: 'message';
    id: number;
    scope: FlyMailScope;
    senderUid: number;
    senderName: string;
    content: string;
    createdAt: string;
    conversationId: number;
    title: string;
  }>;
}
