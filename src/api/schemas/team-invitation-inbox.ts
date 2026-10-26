export type TeamInvitationInbox = {
  access: { ok: boolean; realmName: string | null };
  invitations: { id: number; teamId: number; leaderName: string | null; inviterName: string | null; createdAt: string | null }[];
};
