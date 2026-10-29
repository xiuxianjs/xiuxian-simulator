import { parseBackendTianshiBaoluPanel, type TianshiBaoluCategoryKey } from '../api/bot/tianshi-baolu-panel';
import { mutation } from './mutation';
import { boolean, fields, integer, list, object, page, text } from './schema';

const labels: Record<TianshiBaoluCategoryKey, string> = { all: '全部', equipment_set: '装备', skill_book: '功法', soul_artifact: '本命' };

export const baoluActions = {
  get_tianshi_baolu: mutation<{ category: TianshiBaoluCategoryKey; page: number }>(
    '查询天师宝录收藏、累计加成和点亮条件。服务端会先同步已有收藏的解锁；即使面板读取失败，解锁可能已经提交，同消息重试保留原回执。',
    'tianshi-baolu.panel',
    object({ category: { type: 'string', enum: ['all', 'equipment_set', 'skill_book', 'soul_artifact'] }, page }),
    object({
      ...fields(integer, 'newUnlockCount totalCount unlockedCount filteredCount page totalPages'),
      totalBonusText: text,
      rows: list(object({ id: integer, ...fields(text, 'name entryType typeName condition description bonusText'), unlocked: boolean }))
    }),
    input => `/天师宝录 ${labels[input.category]} p${input.page}`,
    parseBackendTianshiBaoluPanel
  )
};
