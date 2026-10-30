import { validateBackendPlayerProfileAction, type PlayerProfileAction } from '../api/bot/player-profile-action';
import { parseBackendPublicPlayerProfile } from '../api/bot/public-player-profile-query';
import { normalizeRobotBid } from '../api/bot/robot-bid';
import { ExposeError } from 'alemonjs';
import { mutation, observation } from './mutation';
import { boolean, fields, integer, object, text } from './schema';

const publicProfile = object(
  {
    found: boolean,
    hideProfile: boolean,
    profile: object({ uid: integer, ...fields(text, 'name activeTitle realmName') }),
    cave: object(
      {
        relation: { type: 'string', enum: ['self', 'companion', 'friend', 'stranger'] },
        ...fields(text, 'relationLabel auraText summary auraLevel activeFormationName'),
        ...fields(boolean, 'canViewAura blockedByFormation'),
        auraScore: integer
      },
      ['auraLevel', 'auraScore', 'activeFormationName']
    ),
    detail: object({
      ...fields(integer, 'strength intelligence constitution agility luck'),
      battle: object(fields(integer, 'physicalAttack physicalDefense magicAttack magicDefense hp speed critRate critDamage'))
    })
  },
  ['profile', 'cave', 'detail']
);

function profileAction(
  action: PlayerProfileAction,
  command: string,
  description: string,
  schema: { type: 'string'; minLength?: number; maxLength?: number; enum?: string[] }
) {
  return mutation<{ value: string }>(
    description,
    `profile.${action}`,
    object({ value: schema }),
    object({ action: { type: 'string', enum: [action] }, value: text, cleared: boolean }),
    input => `/${command}${input.value ? ` ${input.value}` : ''}`,
    data => validateBackendPlayerProfileAction(data, action)
  );
}

export const profileActions = {
  get_public_player_profile: observation<{ targetUid: number }>(
    '按目标游戏 UID 查询对方公开资料与洞府可见状态；身份仍是当前玩家，服务端决定隐私范围。found=false 表示目标不存在，hideProfile=true 时没有战斗属性。',
    'profile.view',
    object({ targetUid: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } }),
    publicProfile,
    input => `/查看信息 ${input.targetUid}`,
    (data, input) => {
      const result = parseBackendPublicPlayerProfile(data);

      if (result.profile && result.profile.uid !== input.targetUid) {
        throw new Error('公开资料目标编号不匹配');
      }

      return result;
    },
    input => ({ target: { uid: input.targetUid } })
  ),
  get_public_player_profile_by_platform_id: observation<{ targetBid: string }>(
    '使用聊天平台实际提供的目标玩家标识查询其公开资料；不能使用昵称代替标识。服务端解析角色并执行隐私检查，未注册目标返回服务端提示。当前玩家身份不由目标指定。',
    'profile.view',
    object({ targetBid: { type: 'string', minLength: 1, maxLength: 255 } }),
    publicProfile,
    () => '/查看信息',
    parseBackendPublicPlayerProfile,
    input => ({ target: { bid: input.targetBid } }),
    input => {
      try {
        normalizeRobotBid(input.targetBid);
      } catch {
        throw new ExposeError('INVALID_INPUT', '目标平台标识无效');
      }
    }
  ),
  rename_player: profileAction('rename', '改名', '修改当前角色道号，会消耗更名卡；服务端校验道号、库存和是否重名。', {
    type: 'string',
    minLength: 1,
    maxLength: 8
  }),
  change_player_gender: profileAction('gender', '改性', '修改当前角色性别，会消耗改性卡；服务端校验库存并返回实际结果。', {
    type: 'string',
    enum: ['男', '女']
  }),
  set_player_signature: profileAction('signature', '改签名', '修改当前角色签名；value 为空字符串时清空，服务端校验长度及内容并返回实际保存值。', {
    type: 'string',
    maxLength: 200
  })
};
