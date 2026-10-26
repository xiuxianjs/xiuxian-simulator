export type FriendRequestRejectResult = {
  outcome: 'rejected' | 'not_found' | 'processed' | 'locked' | 'failed';
  listed: boolean;
  fromUserName: string | null;
  realmName: string | null;
};
