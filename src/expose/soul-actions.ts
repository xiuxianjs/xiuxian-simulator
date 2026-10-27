import { ExposeError } from 'alemonjs';
import { parseSoulChoosePreview } from '../api/bot/soul-path-choose';
import { parseSoulActionPreview } from '../api/bot/soul-path-action';
import { parseSoulConfirm } from '../api/bot/soul-confirm-business';
import { parseSoulNurture, parseSoulSupplyDirection } from '../api/bot/soul-path';
import { mutation } from './mutation';
import { boolean, fields, integer, list, object, text } from './schema';

type Path = 'xuan_fa' | 'lian_ti' | 'yu_qi';
type Direction = 'ding_hun' | 'yang_po' | 'wu_dao' | 'chu_qiao';
const pathNames = { xuan_fa: '玄法', lian_ti: '炼体', yu_qi: '御器' };
const directionNames = { ding_hun: '定魂', yang_po: '养魄', wu_dao: '悟道', chu_qiao: '出窍', auto: '自动' };
const pathKey = { type: 'string' as const, enum: Object.keys(pathNames) };
const direction = { type: 'string' as const, enum: ['ding_hun', 'yang_po', 'wu_dao', 'chu_qiao'] };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const pathReceipt = object({ ...fields(text, 'message pathName nodeName pathSwitchAvailableAt'), pathKey }, ['pathSwitchAvailableAt']);
const nurtureFields = {
  ...fields(text, 'direction directionName tier tierName'),
  ...fields(integer, 'stabilityBefore stabilityAfter insightGained proficiencyGained'),
  extraItems: list(object({ name: text, quantity: integer }))
};
const previewSchema = object({ token: text, message: text, confirmationToken: text });

function preview(data: unknown, choose: boolean) {
  const result = choose ? parseSoulChoosePreview(data) : parseSoulActionPreview(data);

  if (!uuid.test(result.token) || !result.message.trim()) {
    throw new Error('神魂预览响应不完整');
  }

  return { ...result, confirmationToken: choose ? `choose:${result.token}` : result.token };
}

export const soulActions = {
  preview_soul_path_choose: mutation<{ pathKey: Path }>(
    '预览首次选择玄法、炼体或御器道途，不执行选择；确认时将返回的 confirmationToken 原样传给 confirm_soul_path。沿用服务端原神魂 UUID 凭证和时效。',
    'soul-path.choose-preview',
    object({ pathKey }),
    previewSchema,
    input => `/选择道途 ${pathNames[input.pathKey]}`,
    data => preview(data, true),
    input => ({ input: pathNames[input.pathKey] })
  ),
  preview_soul_path_switch: mutation<{ pathKey: Path }>(
    '预览切换道途的材料、冷却和效果；不执行切换，需确认原 confirmationToken。',
    'soul-path.switch-preview',
    object({ pathKey }),
    previewSchema,
    input => `/切换道途 ${pathNames[input.pathKey]}`,
    data => preview(data, false),
    input => ({ input: pathNames[input.pathKey] })
  ),
  preview_soul_path_advance: mutation(
    '预览当前道途下一节点的突破条件，不执行突破，需确认原 confirmationToken。',
    'soul-path.advance-preview',
    object({}),
    previewSchema,
    () => '/道途突破',
    data => preview(data, false),
    () => ({ input: '' })
  ),
  preview_soul_path_reroll: mutation(
    '预览最近温养结果的神魂重选，不执行重选；保留服务端材料、结果与次数限制。',
    'soul-path.reroll-preview',
    object({}),
    previewSchema,
    () => '/神魂重选',
    data => preview(data, false),
    () => ({ input: '' })
  ),
  confirm_soul_path: mutation<{ token: string }>(
    '确认本人原神魂预览返回的 confirmationToken，含首次选择的 choose: 前缀；服务端校验归属、时效、原状态及材料。结果未知时先核对当前面板与原回执，不重建预览或跨消息重复提交旧凭证。',
    'soul-path.confirm',
    object({ token: { type: 'string', minLength: 36, maxLength: 43 } }),
    object({ kind: { type: 'string', enum: ['choose', 'switch', 'advance', 'reroll'] }, path: pathReceipt, nurture: object(nurtureFields) }, [
      'path',
      'nurture'
    ]),
    input => `/确认神魂 ${input.token}`,
    (data, input) => {
      const result = parseSoulConfirm(data);
      const path = result.mode === 'choose' ? result.result : result.result.path;

      if ((result.mode === 'choose') !== input.token.startsWith('choose:') || (path && (!path.message.trim() || !path.nodeName.trim()))) {
        throw new Error('神魂确认响应不完整');
      }

      return result.mode === 'choose'
        ? { kind: 'choose', path: result.result }
        : { kind: result.result.action, path: result.result.path, nurture: result.result.nurture };
    },
    input => input,
    input => {
      if (!uuid.test(input.token.startsWith('choose:') ? input.token.slice(7) : input.token)) {
        throw new ExposeError('INVALID_INPUT', '请传入原神魂预览返回的完整 confirmationToken');
      }
    }
  ),
  nurture_soul_path: mutation<{ direction: Direction }>(
    '消耗本人神魂材料进行一次温养；以服务端实际结果、当日次数和额外材料为准，不保证随机档位。',
    'soul-path.nurture',
    object({ direction }),
    object({
      ...nurtureFields,
      ...fields(integer, 'dailyNurtureCount dailyNurtureLimit'),
      ...fields(boolean, 'usedMonthCardExtra rerollable'),
      dailyNurtureProgressText: text
    }),
    input => `/神魂温养 ${directionNames[input.direction]}`,
    (data, input) => {
      const result = parseSoulNurture(data);

      if (result.direction !== input.direction || result.dailyNurtureCount < 1 || result.dailyNurtureLimit < 1) {
        throw new Error('神魂温养回执无效');
      }

      return result;
    },
    input => ({ input: directionNames[input.direction] })
  ),
  set_soul_supply_direction: mutation<{ direction: Direction | 'auto' }>(
    '设置每日神魂材料补给方向；auto 恢复服务端自动方向。仅设置方向，不代表已发放补给。',
    'soul-path.supply',
    object({ direction: { type: 'string', enum: Object.keys(directionNames) } }),
    object({ direction: { type: 'string', enum: Object.keys(directionNames) }, directionName: text, message: text }),
    input => `/神魂补给 ${directionNames[input.direction]}`,
    (data, input) => {
      const result = parseSoulSupplyDirection(data);
      const selected = result.direction ?? 'auto';

      if (selected !== input.direction || !result.message.trim()) {
        throw new Error('神魂补给回执无效');
      }

      return { ...result, direction: selected };
    },
    input => ({ input: directionNames[input.direction] })
  )
};
