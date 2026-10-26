export type GuildDissolveMutation = {
  outcome: 'confirmation_required' | 'dissolved';
  message: string;
  guildId: number;
  guildName: string;
  confirmationRequired: boolean;
  confirmationExpiresInSeconds?: number;
  memberCount: number;
  refundPerMember: number;
};
