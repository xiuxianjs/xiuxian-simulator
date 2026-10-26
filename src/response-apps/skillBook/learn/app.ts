import { learnBackendSkillBook } from '@src/api/bot/skill-book-learn';
import { BackendAPIError } from '@src/api/bot/client';
import type { BackendRequestContext } from '@src/api/bot/context';
import type { SkillBookMaximum } from '@src/api/schemas/skill-book-switch';
import { logger } from 'alemonjs';

export type SkillBookLearnResult =
  | { code: 'OK'; data: { message: string; result: any } }
  | { code: 'NEED_CONFIRM'; data: { message: string; actualSkillBookId: number } }
  | { code: 'NO_SKILL_BOOKS'; data: { message: string } }
  | { code: 'NOT_FOUND'; data: { message: string; skillBookId: number } }
  | { code: 'UNIDENTIFIED'; data: { message: string; name: string } }
  | { code: 'LOCKED'; data: { message: string; name: string; skillBookId: number } }
  | { code: 'FAILED'; data: { message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

const comparisonFields: Array<[keyof SkillBookMaximum, string, boolean]> = [
  ['physicalAttack', '物攻', false],
  ['magicAttack', '法攻', false],
  ['physicalDefense', '物防', false],
  ['magicDefense', '法防', false],
  ['hp', '气血', false],
  ['physicalAttackPercent', '物攻加成', true],
  ['magicAttackPercent', '法攻加成', true],
  ['physicalDefensePercent', '物防加成', true],
  ['magicDefensePercent', '法防加成', true],
  ['hpPercent', '气血加成', true],
  ['speed', '速度', false],
  ['critRate', '暴击率', true],
  ['critDamage', '暴击伤害', true]
];

function comparison(oldMaximum: SkillBookMaximum, targetMaximum: SkillBookMaximum): string[] {
  return comparisonFields.flatMap(([key, label, percent]) => {
    const oldValue = oldMaximum[key];
    const targetValue = targetMaximum[key];

    if (oldValue === 0 && targetValue === 0) {
      return [];
    }
    const trend = targetValue > oldValue ? '↑' : targetValue < oldValue ? '↓' : '→';

    return [`${label}: ${oldValue}${percent ? '%' : ''} -> ${targetValue}${percent ? '%' : ''}（${trend}）`];
  });
}

function summary(label: string, book: { name: string; grade: string; realm: string }): string {
  return `${label}：${book.name ? `【${book.name}】` : '【未知功法】'}${book.grade ? `【${book.grade}】` : ''}${book.realm ? `【${book.realm}】` : ''}`;
}

function comparisonSection(lines: string[]): string {
  return lines.length === 0 ? '' : `\n\n满级上限对比\n${lines.map(line => `> ${line}`).join('\n')}`;
}

export default async function App(params: {
  bid?: string;
  uid: number;
  skillBookId: number;
  forceReplace: boolean;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<SkillBookLearnResult> {
  try {
    const result = await learnBackendSkillBook(params.bid, params.uid, params.skillBookId, params.forceReplace, params.request, params.messageText);

    switch (result.outcome) {
      case 'empty_bag':
        return { code: 'NO_SKILL_BOOKS', data: { message: '储物袋中没有功法' } };
      case 'not_found':
        return { code: 'NOT_FOUND', data: { message: `储物袋中找不到ID为 ${params.skillBookId} 的功法`, skillBookId: params.skillBookId } };
      case 'unidentified':
        return { code: 'UNIDENTIFIED', data: { message: `【${result.skillBook!.name}】数据尚未就绪，请重新打开功法背包`, name: result.skillBook!.name } };
      case 'locked':
        return {
          code: 'LOCKED',
          data: { message: `【${result.skillBook!.name}】已被锁定，无法学习`, name: result.skillBook!.name, skillBookId: params.skillBookId }
        };
      case 'already_learned':
        return { code: 'FAILED', data: { message: '该功法已经学习' } };
      case 'in_use_conflict': {
        const inUse = result.oldSkillBook!;

        return {
          code: 'FAILED',
          data: {
            message: `功法正在使用中，无法替换\n\n使用中: 【${inUse.name}】【${inUse.skillType}】\n\n💡请先使用 /换下${inUse.skillType} 卸下功法后再替换`
          }
        };
      }
      case 'lower_grade':
        return {
          code: 'FAILED',
          data: { message: `当前待学功法品级低于已学功法\n\n${summary('已学', result.oldSkillBook!)}\n${summary('待学', result.skillBook!)}` }
        };
      case 'confirmation_required': {
        const lines = comparison(result.oldMaximum!, result.targetMaximum!);

        return {
          code: 'NEED_CONFIRM',
          data: {
            actualSkillBookId: result.skillBook!.id,
            message: `检测到已学习相同技能的功法，是否替换？\n\n${summary('已学', result.oldSkillBook!)}\n${summary('待学', result.skillBook!)}${comparisonSection(lines)}\n\n熟练度继承：${result.oldSkillBook!.proficiency}%`
          }
        };
      }
      case 'learned':
        return {
          code: 'OK',
          data: {
            message: '学习成功',
            result: { success: true, skillBook: result.skillBook, replaced: Boolean(result.oldSkillBook), refundInfo: result.refundInfo }
          }
        };
    }
  } catch (error) {
    if (error instanceof BackendAPIError) {
      return { code: 'FAILED', data: { message: error.message } };
    }
    logger.error('学习功法失败:', error);

    return { code: 'LOAD_FAILED', data: { message: '学习功法失败，请稍后再试或联系运营。' } };
  }
}
