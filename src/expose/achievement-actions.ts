import { validateBackendAchievementOverview } from '../api/bot/achievement-overview-query';
import { validateBackendAchievementCategoryProjection } from '../api/bot/achievement-category-projection';
import { validateGuardedAchievement } from '../api/bot/achievement-robot-query';
import { validateBackendAchievements } from '../api/bot/queries';
import { validateBackendCombatPowerAchievements } from '../api/bot/combat-power-achievement-query';
import { validateBackendAchievementClaim } from '../api/bot/achievement-claim';
import { validateBackendTitleOverview } from '../api/bot/title-overview-query';
import { validateBackendActivatedTitle, validateBackendDeactivatedTitle } from '../api/bot/title-actions';
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from './mutation';
import { boolean, fields, integer, list, number, object, page, text } from './schema';
import type { ExposeValueSchema } from 'alemonjs';

const empty = object({});
const access = object({ canUseFifthLayerFeature: boolean, realmName: text });
const guarded = (data: ExposeValueSchema) => object({ locked: boolean, realmName: text, data }, ['realmName', 'data']);
const achievementPage = object({
  items: list(
    object(
      {
        id: integer,
        ...fields(text, 'name description completedAt category rewardText progressText'),
        displayIndex: integer,
        threshold: number,
        ...fields(boolean, 'completed claimed')
      },
      ['name', 'description', 'completedAt', 'displayIndex', 'category', 'rewardText', 'progressText', 'threshold', 'completed', 'claimed']
    )
  ),
  page: object(fields(integer, 'currentPage totalPages total'))
});

function pageData(data: unknown, completed: boolean) {
  // Validate the established contract, then project raw facts so nullable names
  // remain absent rather than becoming presentation fallback text.
  validateBackendAchievements(data, completed);

  return data;
}
const combatCard = { ...fields(integer, 'id'), ...fields(text, 'name description rewardText'), threshold: number };
const titleDefinition = object(
  fields(
    number,
    'normalAttackCritRate skillCritRate ultimateCritRate allSkillCritRate physicalAttack magicAttack physicalDefense magicDefense hp speed critRate critDamage antiCritRate hitRate dodgeRate physicalAttackPercent magicAttackPercent physicalDefensePercent magicDefensePercent hpPercent speedPercent'
  )
);
const titleFacts = { ...fields(text, 'type source sourceId grantedAt expireTime'), definition: titleDefinition };
const optionalTitleFacts = ['type', 'source', 'sourceId', 'grantedAt', 'expireTime', 'definition'];
const categories = ['general', 'storyline', 'lingzhi', 'combat_power', 'tower_shop_unlock', 'master'] as const;
const categoryNames = { general: '通用', storyline: '主线', lingzhi: '灵田', combat_power: '战力', tower_shop_unlock: '妖塔奖励', master: '师门' } as const;

export const achievementActions = {
  get_achievement_overview: observation(
    '查询成就分类、完成进度、可领取数量和服务端资格；完成率沿用服务端单位，查询不会领取奖励。',
    'achievements.overview',
    empty,
    object({
      access,
      summary: object({ ...fields(integer, 'totalAchievements completedAchievements'), completionRate: number }),
      totalClaimable: integer,
      canClaimAll: boolean,
      categories: list(
        object(
          { ...fields(text, 'category label command'), ...fields(integer, 'total completed claimableCount'), completionRate: number, hasClaimable: boolean },
          ['command']
        )
      )
    }),
    () => '/成就',
    validateBackendAchievementOverview
  ),
  get_achievement_category: observation<{ category:(typeof categories)[number] }>(
    '查询指定成就分类的进度、条件、奖励文案和可领数量；category 使用总览中的分类代码，validCategory=false 表示服务端不支持该分类。',
    'achievements.category',
    object({ category: { type: 'string', enum: [...categories] } }),
    object(
      {
        access,
        validCategory: boolean,
        ...fields(text, 'category label'),
        ...fields(integer, 'total completed claimableCount'),
        items: list(object({ id: integer, ...fields(text, 'name description rewardText progressText'), completed: boolean }))
      },
      ['category', 'label']
    ),
    input => `/成就 ${categoryNames[input.category]}`,
    validateBackendAchievementCategoryProjection,
    input => ({ keyword: input.category })
  ),
  get_all_achievements: observation<{ page: number }>(
    '分页查询全部成就配置，每页5项；不是本人已达成列表，也不代表奖励已经获得。',
    'achievements.all',
    object({ page }),
    achievementPage,
    input => `/所有成就 ${input.page}`,
    data => pageData(data, false),
    input => ({ page: input.page, pageSize: 5 })
  ),
  get_completed_achievements: observation<{ page: number }>(
    '分页查询本人已达成成就及完成时间，每页5项；locked=true 表示服务端资格未满足，不是空记录。缺失名称或描述保留为可选字段。',
    'achievements.completed',
    object({ page }),
    guarded(achievementPage),
    input => `/我的成就 ${input.page}`,
    data => validateGuardedAchievement(data, value => pageData(value, true)),
    input => ({ page: input.page, pageSize: 5 })
  ),
  get_combat_power_achievements: observation(
    '查询本人当前战力、战力成就里程碑和下一目标；completed、claimed、reachable 分别保留，不将历史达成当作当前可领。locked=true 表示未解锁。',
    'achievements.combat-power',
    empty,
    guarded(
      object(
        {
          ...fields(integer, 'currentPower totalCount completedCount claimableCount'),
          allCompleted: boolean,
          currentClaimable: object({ ...combatCard, remainingClaimableCount: integer }),
          nextTarget: object({ ...combatCard, remainingPower: number }),
          items: list(object({ ...combatCard, ...fields(boolean, 'completed claimed reachable') }))
        },
        ['currentClaimable', 'nextTarget']
      )
    ),
    () => '/成就 战力',
    data => validateGuardedAchievement(data, validateBackendCombatPowerAchievements)
  ),
  claim_combat_power_achievements: mutation<{ intentId?: string; taskInput?: string }>(
    '领取服务端判定可领取的战力成就奖励；locked=true 表示没有发奖，检查实际 claimedCount 和奖励回执。重复请求使用原消息幂等键。',
    'achievements.claim-combat-power',
    object({ intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    guarded(object({ claimedCount: integer, claimed: list(object(fields(text, 'category categoryLabel achievementName rewardText'))) })),
    () => '/成就 战力 领取',
    data => validateGuardedAchievement(data, validateBackendAchievementClaim),
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  get_titles: observation(
    '查询本人当前有效称号、佩戴状态、效果说明与有效期；称号 id 是本人持有记录编号，用于 activate_title，不能传称号模板编号。',
    'titles.overview',
    empty,
    object({
      moodText: text,
      titles: list(
        object({ id: integer, ...fields(text, 'title description bonusSummary expireDate actionLabel actionCommand'), isActive: boolean, ...titleFacts }, [
          'description',
          'bonusSummary',
          'expireDate',
          ...optionalTitleFacts
        ])
      )
    }),
    () => '/我的称号',
    data => {
      validateBackendTitleOverview(data);

      return data;
    }
  ),
  activate_title: mutation<{ titleId: number }>(
    '佩戴本人持有的有效称号，titleId 来自 get_titles 的 id；所有权和过期由服务端检查，返回实际佩戴回执。',
    'titles.activate',
    object({ titleId: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } }),
    object({ id: integer, title: text, isActive: boolean, description: text, ...titleFacts }, ['description', ...optionalTitleFacts]),
    input => `/佩戴称号 ${input.titleId}`,
    (data, input) => {
      validateBackendActivatedTitle(data, input.titleId);

      return data;
    }
  ),
  deactivate_title: mutation(
    '卸下本人当前称号；removed=false 表示当前没有需要卸下的称号，不能报告已卸下一个称号。',
    'titles.deactivate',
    empty,
    object({ removed: boolean }),
    () => '/卸下称号',
    validateBackendDeactivatedTitle
  )
};
