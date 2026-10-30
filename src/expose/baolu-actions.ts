import { parseBackendTianshiBaoluPanel, type TianshiBaoluCategoryKey } from '../api/bot/tianshi-baolu-panel';
import { parseTianshiBaoluCommand } from '../api/bot/tianshi-baolu-command';
import { ExposeError } from 'alemonjs';
import { intentIdSchema, mutation, taskInputSchema, validateIntentId } from './mutation';
import { boolean, fields, integer, list, object, page, text } from './schema';

const labels: Record<TianshiBaoluCategoryKey, string> = { all: '全部', equipment_set: '装备', skill_book: '功法', soul_artifact: '本命' };

export const baoluActions = {
  get_tianshi_baolu: mutation<{ category: TianshiBaoluCategoryKey; page: number; intentId?: string; taskInput?: string }>(
    '查询天师宝录收藏、累计加成和点亮条件。服务端会先同步已有收藏的解锁；即使面板读取失败，解锁可能已经提交。连锁任务先推进后查询；新操作使用新 intentId，同次重试沿用原编号。',
    'tianshi-baolu.panel',
    object(
      {
        category: { type: 'string', enum: ['all', 'equipment_set', 'skill_book', 'soul_artifact'] },
        page,
        intentId: intentIdSchema,
        taskInput: taskInputSchema
      },
      ['intentId', 'taskInput']
    ),
    object({
      ...fields(integer, 'newUnlockCount totalCount unlockedCount filteredCount page totalPages'),
      totalBonusText: text,
      rows: list(object({ id: integer, ...fields(text, 'name entryType typeName condition description bonusText'), unlocked: boolean }))
    }),
    input => (input.taskInput === undefined ? `/天师宝录 ${labels[input.category]} p${input.page}` : `/${input.taskInput.trim().replace(/^[!！/#＃]\s*/, '')}`),
    parseBackendTianshiBaoluPanel,
    input => ({ category: input.category, page: input.page }),
    input => {
      validateIntentId(input.intentId);
      if (input.taskInput !== undefined) {
        const command = input.taskInput.trim();
        const parsed = parseTianshiBaoluCommand(command);

        if (
          !/^[!！/#＃]?天师宝录(?:\s+(?:全部|装备|功法|本命))?(?:\s+p\d+)?$/u.test(command) ||
          parsed.category !== input.category ||
          parsed.page !== input.page
        ) {
          throw new ExposeError('INVALID_INPUT', '任务步骤必须与天师宝录分类及页码一致');
        }
      }
    },
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  )
};
