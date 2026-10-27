import { parseRobotSkillBookLearn } from '../api/bot/skill-book-learn';
import { parseSkillBookSwitchOptions } from '../api/bot/skill-book-switch-options';
import { parseSkillBookSwitchResponse } from '../api/bot/skill-book-switch';
import { mutation } from './mutation';
import { confirmationReferenceSchema, validateConfirmationReference } from './confirmation';
import { boolean, fields, integer, list, number, object, text } from './schema';

type SkillType = '战技' | '被动技' | '神通';
const skillType = { type: 'string' as const, enum: ['战技', '被动技', '神通'] };
const bookId = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const book = object({ id: integer, name: text, skillType });
const learned = object({ id: integer, ...fields(text, 'name grade realm'), ...fields(integer, 'gradeLevel proficiency'), skillType });
const refund = object({
  ...fields(integer, 'totalExp baseExp upgradeExp upgradeCount transferredProficiency'),
  items: list(object({ ...fields(integer, 'itemId quantity expValue'), name: text }))
});
const maximum = object(
  fields(
    number,
    'physicalAttack magicAttack physicalDefense magicDefense hp physicalAttackPercent magicAttackPercent physicalDefensePercent magicDefensePercent hpPercent speed critRate critDamage'
  )
);
const options = list(
  object({ id: integer, name: text, skillType, status: { type: 'integer', minimum: 2, maximum: 3 }, ...fields(boolean, 'isInUse canSwitch') })
);
const switchResult = object(
  {
    outcome: { type: 'string', enum: ['switched', 'confirmation_required'] },
    skillBook: book,
    oldSkillBook: book,
    targetMaximum: maximum,
    oldMaximum: maximum,
    comparisonLines: list(text),
    confirmationMessage: text
  },
  ['oldSkillBook', 'targetMaximum', 'oldMaximum', 'comparisonLines', 'confirmationMessage']
);

function switchData(data: unknown, type: SkillType, expectedId?: number) {
  const row = data as Record<string, unknown> | null;

  if (row?.skillType !== type || (row.code !== 'SHOW_LIST' && row.code !== 'OK')) {
    throw new Error('功法切换响应不完整');
  }
  if (row.code === 'SHOW_LIST') {
    return { code: row.code, skillType: type, options: parseSkillBookSwitchOptions(row.options, type) };
  }
  const result = parseSkillBookSwitchResponse(row.result);

  if (expectedId === undefined || result.skillBook.id !== expectedId || result.skillBook.skillType !== type) {
    throw new Error('功法切换结果与请求不匹配');
  }

  return { code: row.code, skillType: type, result };
}

export const skillActions = {
  prepare_skill_learn: mutation<{ bookId: number }>(
    '学习本人背包功法；若需替换同技能功法，返回原比较、预计返还与 reference，尚未学习。不存在旧功法时会按服务端规则直接学习。',
    'skill-books.learn',
    object({ bookId }),
    object(
      {
        outcome: { type: 'string', enum: ['learned', 'confirmation_required'] },
        skillBook: learned,
        oldSkillBook: learned,
        targetMaximum: maximum,
        oldMaximum: maximum,
        refundInfo: refund,
        previewRefund: refund,
        reference: confirmationReferenceSchema
      },
      ['oldSkillBook', 'targetMaximum', 'oldMaximum', 'refundInfo', 'previewRefund', 'reference']
    ),
    input => `/学习功法 ${input.bookId}`,
    (data, input) => {
      const result = parseRobotSkillBookLearn(data);

      if (result.skillBook?.id !== input.bookId) {
        throw new Error('学习功法结果与请求不匹配');
      }
      if (result.outcome === 'confirmation_required') {
        const row = data as { reference?: unknown; previewRefund?: unknown };

        if (typeof row.reference !== 'string' || !row.previewRefund || typeof row.previewRefund !== 'object') {
          throw new Error('功法学习预览不完整');
        }
        validateConfirmationReference(row.reference, 'l');

        return { ...result, reference: row.reference, previewRefund: row.previewRefund };
      }

      return result;
    },
    input => ({ bookId: String(input.bookId), confirm: null, exposePreview: true })
  ),
  confirm_skill_learn: mutation<{ bookId: number; reference: string }>(
    '确认原功法学习替换；服务端核对原功法、熟练度及返还依据，并在同一事务中返还、替换与记录回执。引用跨消息重试返回原结果；状态变化时拒绝。',
    'skill-books.learn',
    object({ bookId, reference: confirmationReferenceSchema }),
    object({ outcome: { type: 'string', enum: ['learned'] }, skillBook: learned, oldSkillBook: learned, refundInfo: refund }),
    input => `/学习功法 ${input.bookId} 确认`,
    (data, input) => {
      const result = parseRobotSkillBookLearn(data);

      if (result.outcome !== 'learned' || result.skillBook?.id !== input.bookId || !result.oldSkillBook || !result.refundInfo) {
        throw new Error('功法学习确认回执不完整');
      }

      return result;
    },
    input => ({ bookId: String(input.bookId), confirm: '确认', reference: input.reference }),
    input => validateConfirmationReference(input.reference, 'l')
  ),
  learn_skill_book: mutation<{ bookId: number }>(
    '学习背包中的功法实例，不强制替换已学同类功法。outcome=confirmation_required 表示仅返回替换比较，尚未完成学习；保留原功法与返还规则。',
    'skill-books.learn',
    object({ bookId }),
    object(
      {
        outcome: { type: 'string', enum: ['learned', 'confirmation_required'] },
        skillBook: learned,
        oldSkillBook: learned,
        targetMaximum: maximum,
        oldMaximum: maximum,
        refundInfo: object({
          ...fields(integer, 'totalExp baseExp upgradeExp upgradeCount transferredProficiency'),
          items: list(object({ ...fields(integer, 'itemId quantity expValue'), name: text }))
        })
      },
      ['oldSkillBook', 'targetMaximum', 'oldMaximum', 'refundInfo']
    ),
    input => `/学习功法 ${input.bookId}`,
    (data, input) => {
      const result = parseRobotSkillBookLearn(data);

      if (result.skillBook?.id !== input.bookId) {
        throw new Error('学习功法结果与请求不匹配');
      }

      return result;
    },
    input => ({ bookId: String(input.bookId), confirm: null })
  ),
  get_skill_switch_options: mutation<{ skillType: SkillType }>(
    '查询指定战技、被动技或神通可切换列表，不执行切换；保留实例编号、使用状态和服务端资格。',
    'skill-books.switch',
    object({ skillType }),
    object({ code: { type: 'string', enum: ['SHOW_LIST'] }, skillType, options }),
    input => `/切换${input.skillType}`,
    (data, input) => switchData(data, input.skillType),
    input => ({ skillType: input.skillType, bookId: null, confirm: null })
  ),
  switch_skill_book: mutation<{ skillType: SkillType; bookId: number }>(
    '切换到本人已学功法，不强制确认替换。code=SHOW_LIST 是服务端返回的候选列表；result.outcome=confirmation_required 是待确认比较，均不代表切换成功。',
    'skill-books.switch',
    object({ skillType, bookId }),
    object({ code: { type: 'string', enum: ['SHOW_LIST', 'OK'] }, skillType, options, result: switchResult }, ['options', 'result']),
    input => `/切换${input.skillType} ${input.bookId}`,
    (data, input) => switchData(data, input.skillType, input.bookId),
    input => ({ skillType: input.skillType, bookId: String(input.bookId), confirm: null })
  ),
  prepare_skill_switch: mutation<{ skillType: SkillType; bookId: number }>(
    '切换已学功法；若已有同类型功法在使用，返回原比较及 reference，尚未切换，须使用该引用确认。若原槽位为空，服务端会直接切换并返回 switched。',
    'skill-books.switch',
    object({ skillType, bookId }),
    object({ code: { type: 'string', enum: ['SHOW_LIST', 'OK'] }, skillType, options, result: switchResult, reference: confirmationReferenceSchema }, [
      'options',
      'result',
      'reference'
    ]),
    input => `/切换${input.skillType} ${input.bookId}`,
    (data, input) => {
      const parsed = switchData(data, input.skillType, input.bookId);

      if ('result' in parsed && parsed.result?.outcome === 'confirmation_required') {
        const reference = (data as { reference?: unknown }).reference;

        if (typeof reference !== 'string') {
          throw new Error('功法切换确认引用缺失');
        }
        validateConfirmationReference(reference, 'k');

        return { ...parsed, reference };
      }

      return parsed;
    },
    input => ({ skillType: input.skillType, bookId: String(input.bookId), confirm: null, exposePreview: true })
  ),
  confirm_skill_switch: mutation<{ skillType: SkillType; bookId: number; reference: string }>(
    '确认原功法切换预览；提交原类型、目标实例和 reference，服务端核对原使用中功法及比较属性后事务切换。原引用跨消息重试返回原结算，不自动替换已变化的功法。',
    'skill-books.switch',
    object({ skillType, bookId, reference: confirmationReferenceSchema }),
    object({ code: { type: 'string', enum: ['OK'] }, skillType, result: switchResult }),
    input => `/切换${input.skillType} ${input.bookId} 确认`,
    (data, input) => {
      const parsed = switchData(data, input.skillType, input.bookId);

      if (parsed.code !== 'OK' || !('result' in parsed) || parsed.result?.outcome !== 'switched') {
        throw new Error('功法切换确认结果不完整');
      }

      return parsed;
    },
    input => ({ skillType: input.skillType, bookId: String(input.bookId), confirm: '确认', reference: input.reference }),
    input => validateConfirmationReference(input.reference, 'k')
  )
};
