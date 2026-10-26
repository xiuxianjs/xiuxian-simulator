import { type TeamPreferenceAction } from '@src/api/bot/team-preferences';
import { logger, type Next } from 'alemonjs';
import type { GameEvent } from '@src/types/event';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { validateRobotPreference } from '@src/api/bot/settings-robot-query';
type Result = { code: 'OK'; data: TeamPreferenceAction } | { code: 'SET_FAILED' };
export default async function App(params: { event: GameEvent; next: Next; action: TeamPreferenceAction }): Promise<Result | undefined> {
  try {
    const action = params.action;
    const operations = {
      AUTO_APPROVE_FRIEND_TEAM: 'settings.friend-team-approval',
      TEAM_INVITE_ENABLED: 'settings.team-invites',
      TEAM_DUNGEON_NO_MENTAL: 'settings.team-dungeon-energy'
    } as const;
    const fields = {
      AUTO_APPROVE_FRIEND_TEAM: 'autoApproveFriendTeam',
      TEAM_INVITE_ENABLED: 'teamInviteEnabled',
      TEAM_DUNGEON_NO_MENTAL: 'teamDungeonNoMental'
    } as const;
    const response = await runRobotBusiness(
      params.event,
      operations[action.type],
      { value: action.enabled },
      data => validateRobotPreference(data, fields[action.type], action.enabled, action),
      params.next
    );

    return response.handled ? undefined : { code: 'OK', data: response.data };
  } catch (error) {
    logger.error(error);

    return { code: 'SET_FAILED' };
  }
}
