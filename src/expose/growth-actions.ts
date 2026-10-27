import { parseRobotSkillDetail } from '../api/bot/skill-detail-queries';
import { parseBackendSkillBookProficiency } from '../api/bot/skill-book-proficiency';
import { parseSkillBookBatchUpgrade } from '../api/bot/skill-book-batch-upgrade';
import { parseProfessionDashboard } from '../api/bot/profession-dashboard-query';
import { mutation } from './mutation';
import { boolean, fields, integer, list, number, object, text } from './schema';

const bookId = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const detailDisplay = object(
  {
    ...fields(
      text,
      'titleText damageLine statusLine proficiencyText visibilityAction visibilityLabel cooldownLine costLine defenseIgnoreLine triggerLine effectNamesLine'
    ),
    ...fields(boolean, 'canComprehend canUseMingwudan canReset'),
    narrativeLines: list(text),
    effectLines: list(text),
    attributeLines: list(text),
    recoveryLines: list(text)
  },
  ['damageLine', 'visibilityLabel', 'costLine', 'defenseIgnoreLine', 'triggerLine', 'effectNamesLine']
);
const detailBook = object(
  {
    ...fields(
      integer,
      'id status isHidden upgradeCount proficiency physicalAttack magicAttack physicalDefense magicDefense hp speed maxPhysicalAttack maxMagicAttack maxPhysicalDefense maxMagicDefense maxHp maxSpeed'
    ),
    ...fields(
      number,
      'physicalAttackPercent magicAttackPercent physicalDefensePercent magicDefensePercent hpPercent critRate critDamage maxPhysicalAttackPercent maxMagicAttackPercent maxPhysicalDefensePercent maxMagicDefensePercent maxHpPercent maxCritRate maxCritDamage'
    ),
    ...fields(text, 'name skillType damageType statusText listText slotText attributeSummary skillName camp triggerCondition'),
    ...fields(boolean, 'canHide canReset'),
    ...fields(integer, 'skillId skillTypeId skillModule cost cooldown targetCount'),
    ...fields(number, 'multiplier defenseIgnorePercent'),
    buffNames: list(text),
    skillEffects: list(
      object(
        {
          ...fields(text, 'name camp triggerScope'),
          ...fields(
            integer,
            'module probability type applyTiming effectTiming applyProbability effectProbability duration multiplier maxStacks attributeModule'
          ),
          removable: boolean
        },
        [
          'camp',
          'triggerScope',
          'module',
          'probability',
          'type',
          'applyTiming',
          'effectTiming',
          'applyProbability',
          'effectProbability',
          'duration',
          'multiplier',
          'maxStacks',
          'attributeModule',
          'removable'
        ]
      )
    ),
    detailDisplay
  },
  ['damageType', 'skillId', 'skillTypeId', 'skillModule', 'cost', 'cooldown', 'targetCount', 'multiplier', 'defenseIgnorePercent', 'camp', 'triggerCondition']
);
const profession = object({
  access: object({
    ...fields(boolean, 'canUseProfessionAndCave canJoinAlchemyGuide'),
    features: list(object({ key: text, realmReached: boolean, requiredRealm: text, lockedReason: text }))
  }),
  alchemy: object(
    {
      ...fields(boolean, 'unlocked canAdvance showSection'),
      title: text,
      ...fields(integer, 'level exp nextExpRequired totalCrafts learnedRecipeCount'),
      primaryAction: { type: 'string', enum: ['recipes', 'continueGuide', 'joinGuide', 'none'] },
      equipments: list(object({ typeName: text, equipped: boolean, equipmentName: text, gradeName: text }, ['equipmentName', 'gradeName'])),
      guide: object({ active: boolean, ...fields(integer, 'step expiresAt'), stepLabel: text }, ['step', 'expiresAt'])
    },
    ['nextExpRequired']
  ),
  lingzhi: object(
    {
      unlocked: boolean,
      ...fields(text, 'title maxFieldGradeLabel cultivationCostText'),
      ...fields(integer, 'level exp nextExpRequired dailyExpGained dailyExpCap maxPlots maxFieldGrade yieldBonus cultivatedCount cultivatableCount'),
      primaryAction: { type: 'string', enum: ['plots', 'joinGuide'] }
    },
    ['nextExpRequired', 'cultivatedCount', 'cultivatableCount', 'cultivationCostText']
  )
});

export const growthActions = {
  get_skill_book_detail: mutation<{ bookId: number }>(
    '查询本人已学功法实例详情、当前和上限属性、技能效果及可操作状态；不执行升级或参悟。可选字段缺失表示服务端未提供。',
    'skill-books.detail',
    object({ bookId }),
    object({ skillBookId: integer, proficiencyPoints: integer, skillBook: detailBook }),
    input => `/查看功法 ${input.bookId}`,
    (data, input) => {
      const result = parseRobotSkillDetail(data);

      if (result.skillBookId !== input.bookId) {
        throw new Error('功法详情与请求实例不匹配');
      }

      return result;
    },
    input => ({ bookId: String(input.bookId) })
  ),
  comprehend_skill_book: mutation<{ bookId: number; points: number }>(
    '对本人功法投入指定熟练点；实际成功、失败、保底及剩余点数以回执为准，不保证每点成功。同一原消息重试复用幂等键；新消息是新操作。',
    'skill-books.proficiency',
    object({ bookId, points: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } }),
    object({
      outcome: { type: 'string', enum: ['ok'] },
      skillBookName: text,
      ...fields(integer, 'consumedPoints oldProficiency newProficiency remainingPoints successCount failCount'),
      pityTriggered: boolean
    }),
    input => `/参悟 ${input.bookId} ${input.points}`,
    (data, input) => {
      const result = parseBackendSkillBookProficiency(data);
      const { consumedPoints, oldProficiency, newProficiency, remainingPoints, successCount, failCount } = result;

      const invalidCounts = [consumedPoints, oldProficiency, newProficiency, remainingPoints, successCount, failCount].some(
        n => !Number.isSafeInteger(n) || n! < 0
      );

      if (
        result.outcome !== 'ok' ||
        invalidCounts ||
        consumedPoints! < 1 ||
        consumedPoints! > input.points ||
        successCount! + failCount! !== consumedPoints ||
        oldProficiency! > newProficiency! ||
        newProficiency! > 100 ||
        newProficiency! - oldProficiency! !== successCount
      ) {
        throw new Error('参悟功法结算响应不完整');
      }

      return result;
    },
    input => ({ tokens: [String(input.bookId), String(input.points)] })
  ),
  upgrade_skill_book: mutation<{ bookId: number; count: number }>(
    '对本人已学功法连续升级，服务端最多处理36次，并可能因材料、灵石或属性上限提前停止。检查实际 successCount、消耗和 stopReason，不能把请求次数当作完成次数。同一原消息重试复用幂等键。',
    'skill-books.batch-upgrade',
    object({ bookId, count: { type: 'integer', minimum: 1, maximum: 36 } }),
    object({
      outcome: { type: 'string', enum: ['ok'] },
      target: object({ id: integer, name: text }),
      ...fields(integer, 'successCount totalConsumedExp totalConsumedSpiritStone lastUpgradeCount upgradeCount skillBookId'),
      attributeChanges: list(object({ name: text, ...fields(number, 'growth currentValue maxValue'), isNew: boolean })),
      attributeLines: list(text),
      stopReason: text
    }),
    input => `/升级功法 ${input.bookId} ${input.count}`,
    (data, input) => {
      const row = data as { mode?: unknown; result?: unknown } | null;

      if (row?.mode !== 'execute') {
        throw new Error('功法升级未返回结算');
      }
      const result = parseSkillBookBatchUpgrade(row.result);

      if (
        result.outcome !== 'ok' ||
        result.skillBookId !== input.bookId ||
        result.target?.id !== input.bookId ||
        result.upgradeCount !== input.count ||
        result.successCount < 0 ||
        result.successCount > result.upgradeCount ||
        result.totalConsumedExp < 0 ||
        result.totalConsumedSpiritStone < 0 ||
        result.lastUpgradeCount < 0
      ) {
        throw new Error('功法升级结算与请求不匹配');
      }

      return result;
    },
    input => ({ bookId: String(input.bookId), count: String(input.count) })
  ),
  get_profession_dashboard: mutation(
    '查询炼丹师与灵药师职业等级、经验、装备、入门引导状态和开放条件；不报名、不领取、不消耗资源。功能条件以 access 为准，缺失可选字段不等于零。',
    'profession.dashboard',
    object({}),
    profession,
    () => '/我的职业',
    data => {
      const result = parseProfessionDashboard(data);

      return { ...result, access: { ...result.access, features: Object.entries(result.access.features ?? {}).map(([key, value]) => ({ key, ...value })) } };
    }
  )
};
