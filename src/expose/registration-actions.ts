import { ExposeError } from 'alemonjs';
import { parseBackendRegistration } from '../api/bot/registration';
import { spiritRoot } from './common-queries';
import { intentIdSchema, mutation, validateIntentId } from './mutation';
import { boolean, integer, list, object, text } from './schema';

const talents = object({
  granted: boolean,
  rulesVersion: integer,
  talents: list(
    object({ code: text, name: text, category: { type: 'string', enum: ['修行', '生活', '战斗'] }, description: text, enabled: boolean, implemented: boolean })
  )
});

// Registration dialogue belongs to the game provider, alongside its result codes.
function registrationResult(value: unknown) {
  const result = parseBackendRegistration(value);
  const dialogue =
    result.code === 'NEED_GENDER'
      ? { text: `{{guide.name}}：道号${result.data.playerName}已经核对，接下来请选择角色性别。`, choices: ['男修', '女修'] }
      : result.code === 'NEED_NAME'
        ? { text: '{{guide.name}}：先告诉我，你想用什么道号？', choices: [] }
        : {
            text:
              result.code === 'EXISTING_USER'
                ? '{{guide.name}}：当前账号已有角色，我们从原角色继续。'
                : '{{guide.name}}：角色已经登记好了，接下来可以进入序章。',
            choices: ['继续']
          };

  return { ...result, dialogue };
}

export const registrationActions = {
  choose_registration_name: mutation<{ name: string }>(
    '玩家明确选择道号后调用。仅提交道号进行校验，不选择性别、不创建角色。NEED_GENDER表示可询问性别，不能说已注册成功。',
    'account.register',
    object({ name: { type: 'string', minLength: 1, maxLength: 8 } }),
    object(
      {
        code: { type: 'string', enum: ['OK', 'EXISTING_USER', 'NEED_NAME', 'NEED_GENDER'] },
        dialogue: object({ text, choices: list(text) }),
        data: object({ playerName: text, talents, spiritRoot }, ['talents', 'spiritRoot'])
      },
      ['data']
    ),
    input => `/我是 ${input.name}`,
    registrationResult,
    (_input, event) => ({ region: event.GuildId ?? event.ChannelId ?? '' }),
    input => {
      if (input.name !== input.name.trim() || /[\r\n\u2028\u2029]/u.test(input.name) || /\s+(男|女)$/u.test(input.name)) {
        throw new ExposeError('INVALID_INPUT', '请单独提供道号，不附加性别或换行');
      }
    }
  ),
  register_player: mutation<{ name: string; gender: '男' | '女' }>(
    '为当前平台账号创建角色；必须使用玩家明确选择的道号和性别。角色创建及道号校验由服务端执行，重复请求使用原消息幂等键。',
    'account.register',
    object({ name: { type: 'string', minLength: 1, maxLength: 8 }, gender: { type: 'string', enum: ['男', '女'] } }),
    object(
      {
        code: { type: 'string', enum: ['OK', 'EXISTING_USER', 'NEED_NAME', 'NEED_GENDER'] },
        dialogue: object({ text, choices: list(text) }),
        data: object({ playerName: text, talents, spiritRoot }, ['talents', 'spiritRoot'])
      },
      ['data']
    ),
    input => `/我是 ${input.name} ${input.gender}`,
    registrationResult,
    (_input, event) => ({ region: event.GuildId ?? event.ChannelId ?? '' }),
    input => {
      if (input.name !== input.name.trim() || /[\r\n\u2028\u2029]/u.test(input.name)) {
        throw new ExposeError('INVALID_INPUT', '道号不能包含换行或首尾空格');
      }
    }
  ),
  continue_registration_guide: mutation<{ intentId?: string }>(
    '继续注册后的序章剧情引导（/继续），每次推进一段；服务端返回实际步骤和可能发生的奖励或晋级。同消息每次新推进使用新 intentId，同次重试沿用原编号。',
    'guide.continue',
    object({ intentId: intentIdSchema }, ['intentId']),
    object({}),
    () => '/继续',
    () => ({}),
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId }
  ),
  skip_registration_guide: mutation<{ intentId?: string }>(
    '跳过注册后的序章剧情引导（/跳过引导），仅在玩家明确要求跳过时使用；服务端决定奖励和晋级结果。',
    'guide.skip',
    object({ intentId: intentIdSchema }, ['intentId']),
    object({}),
    () => '/跳过引导',
    () => ({}),
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId }
  )
};
