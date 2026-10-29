import { validateBackendPlayerProfileAction, type PlayerProfileAction } from '../api/bot/player-profile-action';
import { mutation } from './mutation';
import { boolean, object, text } from './schema';

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
