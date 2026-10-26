export type FriendRequestMutationResult = {
  success: boolean;
  requestId: number;
  targetName: string;
  fromUserName: string;
  message: string;
};
