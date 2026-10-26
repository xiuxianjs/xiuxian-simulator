/** Reads preserve legacy JSON types; setters validate new values separately. */
export interface PlayerPreferencesQueryData {
  meditationAutoBoost?: boolean;
  dungeonBattleMode: unknown;
  teamDungeonNoMental: unknown;
  autoApproveFriendTeam: unknown;
  hideProfile: unknown;
  confirmSpiritCrystal: unknown;
  confirmDaoCrystal: unknown;
  teamInviteEnabled: unknown;
  teamAutoAcceptInvite: unknown;
}
