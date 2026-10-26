export interface GuildResignationMember {
  userId: number;
  roleId: number;
  userExists: boolean;
  name: string | null;
  realmName: string | null;
  roleName: string | null;
  isDeputy: boolean;
  canDemote: boolean;
}
export interface GuildResignationOptions {
  membershipStatus: 'not_joined' | 'guild_missing' | 'members_missing' | 'operator_missing' | 'joined';
  operatorUserId: number | null;
  operatorRoleName: string | null;
  isDeputy: boolean;
  members: GuildResignationMember[];
}
