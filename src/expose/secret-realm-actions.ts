import {
  parseBackendSecretRealmHome,
  parseBackendSecretRealmList,
  parseBackendSecretRealmView,
  parseBackendSecretRealmChallenge,
  parseBackendSecretRealmClaim
} from '../api/bot/guild-secret-realm-war';
import { mutation, observation } from './mutation';
import { boolean, fields, integer, list, object, page, text } from './schema';

const empty = object({});
const realmNo = { type: 'integer' as const, minimum: 1, maximum: 127 };
const home = object(
  {
    isActive: boolean,
    ...fields(text, 'activeStart activeEnd guildName memberRoleName joinAt'),
    ...fields(integer, 'attackUsed maxAttack guildId'),
    activeDataJson: text,
    settledDataJson: text,
    display: object(
      {
        ...fields(text, 'participationNotice statusLabel membershipNotice activeOwnedText outputMultiplierText settledOwnedText rewardText'),
        attackRemaining: integer,
        canPromptClaim: boolean
      },
      ['activeOwnedText', 'outputMultiplierText', 'settledOwnedText', 'rewardText']
    )
  },
  ['guildId', 'joinAt', 'activeDataJson', 'settledDataJson']
);
const summary = object({ ...fields(integer, 'realmNo winnerGuildId winnerPoints'), ...fields(text, 'tier name winnerGuildName') });
const position = object(
  { ...fields(integer, 'positionNo positionPoints npcId occupiedUserId occupiedGuildId'), ...fields(text, 'occupiedUserName occupiedGuildName frozenUntil') },
  ['occupiedUserId', 'occupiedGuildId', 'occupiedUserName', 'occupiedGuildName', 'frozenUntil']
);

export const secretRealmActions = {
  get_spirit_vein_war: observation(
    '查询灵脉攻防战时段、本人宗门、剩余攻击次数和奖励提示；服务端查询可能维护周期状态。',
    'secret-realm.home',
    empty,
    home,
    () => '/灵脉攻防战',
    data => {
      const result = parseBackendSecretRealmHome(data);

      return {
        ...result,
        ...(result.activeData === null ? {} : { activeDataJson: JSON.stringify(result.activeData) }),
        ...(result.settledData === null ? {} : { settledDataJson: JSON.stringify(result.settledData) })
      };
    }
  ),
  list_spirit_vein_realms: observation<{ page?: number }>(
    '分页查询灵脉攻防战秘境及领先宗门；每页五条，返回秘境编号供查看阵位。',
    'secret-realm.list',
    object({ page }, ['page']),
    object({ items: list(summary) }),
    input => `/灵脉攻防战列表 ${input.page ?? 1}`,
    parseBackendSecretRealmList,
    input => ({ page: String(input.page ?? 1) })
  ),
  get_spirit_vein_positions: observation<{ realmNo: number; page?: number }>(
    '分页查询指定灵脉秘境的阵位、占领者和冻结时间；每页五条。',
    'secret-realm.view',
    object({ realmNo, page }, ['page']),
    object({ positions: list(position) }),
    input => `/灵脉攻防战查看 ${input.realmNo} ${input.page ?? 1}`,
    parseBackendSecretRealmView,
    input => ({ realmNo: String(input.realmNo), page: String(input.page ?? 1) })
  ),
  challenge_spirit_vein_position: mutation<{ realmNo: number; positionNo: number }>(
    '挑战指定灵脉阵位；服务端检查活动时段、宗门、次数和冻结状态，返回胜负及实际参与贡献。',
    'secret-realm.challenge',
    object({ realmNo, positionNo: realmNo }),
    object({ won: boolean, ...fields(integer, 'realmNo positionNo participationContribution'), frozenUntil: text }, ['frozenUntil']),
    input => `/灵脉攻防战挑战 ${input.realmNo} ${input.positionNo}`,
    (data, input) => {
      const result = parseBackendSecretRealmChallenge(data);

      if (
        result.realmNo !== input.realmNo ||
        result.positionNo !== input.positionNo ||
        !(data && typeof data === 'object' && 'participationContribution' in data)
      ) {
        throw new Error('灵脉挑战回执与请求不匹配');
      }

      return result;
    },
    input => ({ realmNo: String(input.realmNo), positionNo: String(input.positionNo) })
  ),
  claim_spirit_vein_war_rewards: mutation(
    '领取本人可领取的灵脉攻防战结算奖励，以实际灵晶、贡献和声望回执为准。',
    'secret-realm.claim',
    empty,
    object({ ...fields(integer, 'spiritCrystal contribution reputation ownedRealms'), reputationAlreadyClaimed: boolean }),
    () => '/灵脉攻防战领取奖励',
    parseBackendSecretRealmClaim
  )
};
