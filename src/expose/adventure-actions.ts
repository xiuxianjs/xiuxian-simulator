import { ExposeError } from 'alemonjs';
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from './mutation';
import { boolean, fields, integer, list, number, object, text } from './schema';
import { parseBackendDungeonDetail } from '../api/bot/queries';
import { parseRobotDungeonChallenge } from '../api/bot/dungeon-challenge-robot-query';
import { parseDungeonSweep, parseDungeonFreeSweep } from '../api/bot/dungeon-sweep';
import { parseStorylineSweepBusiness } from '../api/bot/storyline-sweep';
import { parseStorylineChapterChestClaim, parseStorylineAllChestClaim } from '../api/bot/storyline-chest-claim';
import { chapter, chapters, dungeons } from './common-queries';
import { parseRobotDungeonCatalog } from '../api/bot/dungeon-robot-query';
import { decodeStorylineCatalog } from '../api/bot/storyline-catalog-queries';

const positive = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const dungeonName = { type: 'string' as const, minLength: 1 };
const reward = object({ ...fields(text, 'category name'), amount: integer });
const sweep = object({ dungeonName: text, ...fields(integer, 'times totalSpiritCost totalExp'), currency: list(reward), items: list(reward) });
const dungeonDetail = object(
  {
    ...fields(integer, 'id spiritCost guildContributionCost minPlayers usedToday dailyLimit freeUsed freeLimit freeRemaining expReward'),
    ...fields(text, 'name typeLabel realmLimit'),
    ...fields(boolean, 'isSingle hasCleared inTeam'),
    currencyDrops: list(object({ ...fields(text, 'code name'), amount: integer })),
    skillDrops: list(object({ ...fields(text, 'category name'), ...fields(integer, 'itemId amount probability') })),
    materialDrops: list(object({ ...fields(text, 'category name'), ...fields(integer, 'itemId amount probability') })),
    firstClearReward: object({ parts: list(text) }),
    outputMultiplier: number,
    outputAddPct: number
  },
  ['firstClearReward', 'outputMultiplier', 'outputAddPct']
);
const chest = object({ ...fields(integer, 'index requiredStars reward'), claimed: boolean, unlocked: boolean });
const chapterChests = object({
  success: boolean,
  message: text,
  ...fields(integer, 'chapterNumber totalReward'),
  claimedIndexes: list(integer),
  chests: list(chest)
});
const dungeonBattle = object(
  {
    ...fields(integer, 'dungeonId experienceGained spiritStoneGained'),
    won: boolean,
    logId: text,
    battle: object({ winner: { type: 'string', enum: ['A', 'B', 'draw'] }, rounds: integer }),
    drops: list(object({ category: text, amount: integer, currencyCode: text, itemId: integer }, ['currencyCode', 'itemId'])),
    rewardsByUser: list(
      object(
        {
          ...fields(integer, 'userId spiritCostPaid experienceGained'),
          eligible: boolean,
          noRewardReason: text,
          currency: list(reward),
          items: list(reward),
          firstClear: list(reward)
        },
        ['noRewardReason', 'firstClear']
      )
    )
  },
  ['logId']
);

type StageInput = { chapterNumber: number; stageNumber: number; times: number; intentId?: string; taskInput?: string };
type TaskCatalogInput = { page?: number; taskInput: string; intentId?: string };
const sweepCommand = (input: StageInput) => `/主线扫荡 ${input.chapterNumber}-${input.stageNumber} ${input.times}`;

function taskCatalog(input: TaskCatalogInput, kind: 'dungeon' | 'storyline') {
  const command = input.taskInput
    .trim()
    .replace(/^[!！/#＃]\s*/, '')
    .trim();
  const match = kind === 'dungeon' ? command.match(/^(?:查看秘境|秘境列表)(?:\s*(\d+))?$/u) : command.match(/^(?:查看主线|主线列表|副本列表)(?:\s+p(\d+))?$/u);
  const page = match?.[1] === undefined ? 1 : Number(match[1]);

  if (!match || !Number.isSafeInteger(page) || page < 1 || page > 2147483647 || (input.page !== undefined && input.page !== page)) {
    throw new ExposeError('INVALID_INPUT', '任务指令与目录页码不匹配');
  }

  return { command: `/${command}`, page };
}

function taskChapter(input: { chapterNumber?: number; taskInput: string }) {
  const command = input.taskInput
    .trim()
    .replace(/^[!！/#＃]\s*/, '')
    .trim();
  const match = command.match(/^(?:查看主线|主线列表|副本列表)\s+(\d+)$/u);
  const chapterNumber = Number(match?.[1]);

  if (
    !match ||
    !Number.isSafeInteger(chapterNumber) ||
    chapterNumber < 1 ||
    chapterNumber > 2147483647 ||
    (input.chapterNumber !== undefined && input.chapterNumber !== chapterNumber)
  ) {
    throw new ExposeError('INVALID_INPUT', '任务指令与主线章节不匹配');
  }

  return { command: `/${command}`, chapterNumber };
}

function checkedChapter(data: unknown, chapterNumber: number) {
  const result = parseStorylineChapterChestClaim(data);

  if (result.chapterNumber !== chapterNumber) {
    throw new Error('主线宝箱返回章节不匹配');
  }

  return result;
}
export const adventureActions = {
  execute_task_dungeon_catalog: mutation<TaskCatalogInput>(
    '执行连锁任务中的“查看秘境”或“秘境列表”目录步骤，页码从 taskInput 读取，指定 page 时须一致。返回秘境编号、资格和任务推进回执。服务端先推进任务再查询；新操作使用新 intentId，同次重试沿用原编号。',
    'dungeon.catalog',
    object({ page: { type: 'integer', minimum: 1, maximum: 2147483647 }, taskInput: taskInputSchema, intentId: intentIdSchema }, ['page', 'intentId']),
    dungeons,
    input => taskCatalog(input, 'dungeon').command,
    data => parseRobotDungeonCatalog(data).data,
    input => ({ pageText: String(taskCatalog(input, 'dungeon').page) }),
    input => {
      validateIntentId(input.intentId);
      taskCatalog(input, 'dungeon');
    },
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  execute_task_storyline_catalog: mutation<TaskCatalogInput>(
    '执行连锁任务中的“查看主线”“主线列表”或“副本列表”章节目录步骤；页码从 taskInput 中的 p 数字读取，指定 page 时须一致。返回章节进度和任务推进回执，不发起挑战。服务端先推进任务再查询；新操作使用新 intentId，同次重试沿用原编号。',
    'storyline.catalog',
    object({ page: { type: 'integer', minimum: 1, maximum: 2147483647 }, taskInput: taskInputSchema, intentId: intentIdSchema }, ['page', 'intentId']),
    chapters,
    input => taskCatalog(input, 'storyline').command,
    data => decodeStorylineCatalog(data, null),
    input => ({ input: taskCatalog(input, 'storyline').command }),
    input => {
      validateIntentId(input.intentId);
      taskCatalog(input, 'storyline');
    },
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  execute_task_storyline_chapter: mutation<{ chapterNumber?: number; taskInput: string; intentId?: string }>(
    '执行连锁任务中查看指定主线章节的步骤，从任务指令读取章节编号；指定 chapterNumber 时须一致。返回关卡、宝箱及任务推进回执。服务端先推进任务再查询；新操作使用新 intentId，同次重试沿用原编号。',
    'storyline.catalog',
    object({ chapterNumber: { type: 'integer', minimum: 1, maximum: 2147483647 }, taskInput: taskInputSchema, intentId: intentIdSchema }, [
      'chapterNumber',
      'intentId'
    ]),
    chapter,
    input => taskChapter(input).command,
    (data, input) => decodeStorylineCatalog(data, taskChapter(input).chapterNumber),
    input => ({ input: taskChapter(input).command }),
    input => {
      validateIntentId(input.intentId);
      taskChapter(input);
    },
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  execute_task_dungeon_detail: mutation<{ dungeonName: string; taskInput: string; intentId?: string }>(
    '执行连锁任务中的秘境详情步骤，返回消耗、资格、掉落和任务推进回执。名称必须与任务指令一致；同名秘境由服务端名称规则选择。服务端先推进任务再查询；新操作使用新 intentId，同次重试沿用原编号。',
    'dungeon.detail',
    object({ dungeonName, taskInput: taskInputSchema, intentId: intentIdSchema }, ['intentId']),
    dungeonDetail,
    input => `/秘境详情 ${input.dungeonName}`,
    data => {
      const row = data as Record<string, unknown> | null;

      if (row?.outcome !== 'result') {
        throw new Error('秘境详情回执不完整');
      }

      return parseBackendDungeonDetail(row.data);
    },
    input => ({ name: input.dungeonName }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  get_dungeon_detail: observation<{ dungeonName: string }>(
    '按 get_dungeons 返回的 items[].name 查询秘境次数、消耗、队伍要求、掉落和首通奖励；不发起挑战。',
    'dungeon.detail',
    object({ dungeonName }),
    dungeonDetail,
    input => `/秘境详情 ${input.dungeonName}`,
    data => {
      const row = data as Record<string, unknown> | null;

      if (row?.outcome !== 'result') {
        throw new Error('秘境详情回执不完整');
      }

      return parseBackendDungeonDetail(row.data);
    },
    input => ({ name: input.dungeonName })
  ),
  get_dungeon_detail_by_id: observation<{ dungeonId: number }>(
    '按 get_dungeons 返回的 items[].id 查询该秘境的消耗、资格、掉落和首通奖励；不发起挑战。配置缓存可能存在短暂延迟，实际资格和结算以操作回执为准。',
    'dungeon.detail',
    object({ dungeonId: positive }),
    dungeonDetail,
    () => '/秘境详情',
    (data, input) => {
      const row = data as Record<string, unknown> | null;

      if (row?.outcome !== 'result') {
        throw new Error('秘境详情回执不完整');
      }
      const result = parseBackendDungeonDetail(row.data);

      if (result.id !== input.dungeonId) {
        throw new Error('秘境详情与指定编号不匹配');
      }

      return result;
    },
    input => ({ dungeonId: input.dungeonId })
  ),
  challenge_dungeon: mutation<{ dungeonName: string; intentId?: string; taskInput?: string }>(
    '按名称挑战秘境，同名时优先使用编号入口；检查 won 和 rewardsByUser。同消息内新挑战使用新 intentId，同次重试沿用原编号。 连锁任务可传入一致的 taskInput，检查任务推进与业务回执。',
    'dungeon.challenge',
    object({ dungeonName, intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    dungeonBattle,
    input => `/秘境挑战 ${input.dungeonName}`,
    data => {
      const result = parseRobotDungeonChallenge(data);

      if (result.outcome !== 'result') {
        throw new Error('秘境挑战未返回结算回执');
      }

      return result.data;
    },
    input => ({ mode: 'challenge', dungeonName: input.dungeonName }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  challenge_dungeon_by_id: mutation<{ dungeonId: number; intentId?: string }>(
    '按 get_dungeons 返回的 items[].id 挑战对应秘境；检查 won 和 rewardsByUser。相同消息内新挑战使用新的 intentId，重试同一次沿用原编号。',
    'dungeon.challenge',
    object({ dungeonId: positive, intentId: intentIdSchema }, ['intentId']),
    dungeonBattle,
    () => '/秘境挑战',
    (data, input) => {
      const result = parseRobotDungeonChallenge(data);

      if (result.outcome !== 'result' || result.data.dungeonId !== input.dungeonId) {
        throw new Error('秘境挑战回执与指定编号不匹配，请核对挑战记录');
      }

      return result.data;
    },
    input => ({ mode: 'challenge', dungeonId: input.dungeonId }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId }
  ),
  sweep_dungeon: mutation<{ dungeonName: string; times: number; intentId?: string; taskInput?: string }>(
    '按名称扫荡秘境 1、5 或 10 次，同名时优先使用编号入口。同消息内新扫荡使用新 intentId，同次重试沿用原编号。 连锁任务可传入一致的 taskInput，检查任务推进与业务回执。',
    'dungeon.sweep',
    object(
      {
        dungeonName,
        times: { type: 'integer', minimum: 1, maximum: 10, description: '仅接受 1、5、10' },
        intentId: intentIdSchema,
        taskInput: taskInputSchema
      },
      ['intentId', 'taskInput']
    ),
    sweep,
    input => `/扫荡秘境 ${input.dungeonName} ${input.times}`,
    data => {
      const row = data as Record<string, unknown>;

      if (row?.outcome !== 'result') {
        throw new Error('秘境扫荡未返回结算回执');
      }

      return parseDungeonSweep(row.data);
    },
    input => ({ mode: 'sweep', dungeonName: input.dungeonName, times: input.times }),
    input => {
      if (![1, 5, 10].includes(input.times)) {
        throw new ExposeError('INVALID_INPUT', '秘境扫荡次数仅支持 1、5、10');
      }
      validateIntentId(input.intentId);
    },
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  sweep_dungeon_by_id: mutation<{ dungeonId: number; times: number; intentId?: string }>(
    '按 get_dungeons 返回的 items[].id 扫荡秘境 1、5 或 10 次；服务端检查资格和消耗。相同消息内新扫荡使用新的 intentId，重试同一次沿用原编号。',
    'dungeon.sweep',
    object({ dungeonId: positive, times: { type: 'integer', minimum: 1, maximum: 10, description: '仅接受 1、5、10' }, intentId: intentIdSchema }, [
      'intentId'
    ]),
    object({ dungeonId: positive, result: sweep }),
    () => '/扫荡秘境',
    (data, input) => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('秘境扫荡回执不完整');
      }
      const row = data as Record<string, unknown>;

      if (row.outcome !== 'result' || row.dungeonId !== input.dungeonId) {
        throw new Error('秘境扫荡回执与指定编号不匹配，请核对扫荡记录');
      }

      return { dungeonId: row.dungeonId, result: parseDungeonSweep(row.data) };
    },
    input => ({ mode: 'sweep', dungeonId: input.dungeonId, times: input.times }),
    input => {
      if (![1, 5, 10].includes(input.times)) {
        throw new ExposeError('INVALID_INPUT', '秘境扫荡次数仅支持 1、5、10');
      }
      validateIntentId(input.intentId);
    },
    { intentId: input => input.intentId }
  ),
  sweep_free_dungeons: mutation(
    '扫荡服务端判定可免费扫荡的秘境，可能部分成功；核对 sweptDungeons、skippedDungeons 和实际精力消耗。回执仅含秘境名称，同名时请用 get_dungeons 重新核对各编号的次数，不自动重试未完成项目。',
    'dungeon.sweep-free',
    object({}),
    object({
      sweptDungeons: list(sweep),
      skippedDungeons: list(object({ dungeonName: text, message: text })),
      ...fields(integer, 'totalTimes totalExp totalSpiritCost')
    }),
    () => '/扫荡免费秘境',
    parseDungeonFreeSweep
  ),
  sweep_free_dungeons_with_ids: mutation<{ intentId?: string; taskInput?: string }>(
    '一键免费扫荡服务端判定符合条件的秘境；status=none 表示没有结算，partial 表示部分结算；stopped=true 表示后续未尝试。逐项返回秘境编号及跳过原因，不自动重试。',
    'dungeon.sweep-free-detailed',
    object({ intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    object({
      sweptDungeons: list(
        object({ dungeonId: positive, dungeonName: text, ...fields(integer, 'times totalSpiritCost totalExp'), currency: list(reward), items: list(reward) })
      ),
      skippedDungeons: list(object({ dungeonId: positive, dungeonName: text, message: text })),
      status: { type: 'string', enum: ['complete', 'partial', 'none'] },
      stopped: boolean,
      ...fields(integer, 'totalTimes totalExp totalSpiritCost')
    }),
    () => '/扫荡免费秘境',
    data => {
      const result = parseDungeonFreeSweep(data);
      const row = data as { sweptDungeons: unknown[]; skippedDungeons: unknown[]; status?: unknown; stopped?: unknown };

      if (!Array.isArray(row.skippedDungeons)) {
        throw new Error('免费扫荡编号回执不完整');
      }
      const ids = (rows: unknown[]) => rows.map(value => {
          const id = (value as { dungeonId?: unknown } | null)?.dungeonId;

          if (!Number.isSafeInteger(id) || Number(id) < 1) {
            throw new Error('免费扫荡秘境编号无效');
          }

          return Number(id);
        });
      const completed = ids(row.sweptDungeons);
      const skipped = ids(row.skippedDungeons);
      const expectedStatus = completed.length === 0 ? 'none' : skipped.length > 0 ? 'partial' : 'complete';

      if (
        new Set([...completed, ...skipped]).size !== completed.length + skipped.length ||
        skipped.length !== result.skippedDungeons.length ||
        row.status !== expectedStatus ||
        typeof row.stopped !== 'boolean' ||
        (row.stopped && skipped.length === 0) ||
        result.totalTimes !== result.sweptDungeons.reduce((total, item) => total + item.times, 0)
      ) {
        throw new Error('免费扫荡秘境编号重复或缺失');
      }

      return {
        ...result,
        status: row.status,
        stopped: row.stopped,
        sweptDungeons: result.sweptDungeons.map((item, i) => ({ ...item, dungeonId: completed[i] })),
        skippedDungeons: result.skippedDungeons.map((item, i) => ({ ...item, dungeonId: skipped[i] }))
      };
    },
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  sweep_storyline: mutation<StageInput>(
    '扫荡指定主线章节关卡；关卡 1..4，次数 1..9999。相同消息内新扫荡使用新的 intentId，重试同一次沿用原编号。totalBonusExp 可能为负。 连锁任务可传入一致的 taskInput，检查任务推进与业务回执。',
    'storyline.sweep',
    object(
      {
        chapterNumber: positive,
        stageNumber: { type: 'integer', minimum: 1, maximum: 4 },
        times: { type: 'integer', minimum: 1, maximum: 9999 },
        intentId: intentIdSchema,
        taskInput: taskInputSchema
      },
      ['intentId', 'taskInput']
    ),
    object({
      chapterNumber: integer,
      stageNumber: integer,
      result: object({
        stageLabel: text,
        ...fields(integer, 'times totalSpiritCost totalExp totalSpiritStone totalBonusExp'),
        expBonusText: text,
        allItemsGained: list(object({ itemId: integer, amount: integer, name: text }))
      })
    }),
    sweepCommand,
    (data, input) => {
      const result = parseStorylineSweepBusiness(data);

      if (result.ignored || result.chapterNumber !== input.chapterNumber || result.stageNumber !== input.stageNumber) {
        throw new Error('主线扫荡回执关卡不匹配');
      }

      return result;
    },
    input => ({ input: sweepCommand(input) }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  claim_storyline_chest: mutation<{ chapterNumber: number; chestIndex: number; intentId?: string; taskInput?: string }>(
    '领取指定主线章节的一只宝箱；编号取章节查询结果，由服务端校验星数和领取状态。',
    'storyline.chests-claim',
    object({ chapterNumber: positive, chestIndex: positive, intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    chapterChests,
    input => `/领取宝箱 ${input.chapterNumber} ${input.chestIndex}`,
    (data, input) => checkedChapter(data, input.chapterNumber),
    input => ({ input: `/领取宝箱 ${input.chapterNumber} ${input.chestIndex}` }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  claim_storyline_chapter_chests: mutation<{ chapterNumber: number; intentId?: string; taskInput?: string }>(
    '领取指定章节全部可领取宝箱，返回实际领取序号、奖励及剩余宝箱状态。',
    'storyline.chests-claim',
    object({ chapterNumber: positive, intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    chapterChests,
    input => `/领取宝箱 ${input.chapterNumber}`,
    (data, input) => checkedChapter(data, input.chapterNumber),
    input => ({ input: `/领取宝箱 ${input.chapterNumber}` }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  claim_all_storyline_chests: mutation<{ intentId?: string; taskInput?: string }>(
    '领取全部章节中可领取的主线宝箱，返回实际章节明细、领取数量与奖励合计。',
    'storyline.chests-claim-all',
    object({ intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    object({
      success: boolean,
      message: text,
      ...fields(integer, 'totalReward claimedCount'),
      details: list(object({ chapterNumber: integer, chapterName: text, claimed: list(integer), reward: integer }))
    }),
    () => '/一键领取宝箱',
    parseStorylineAllChestClaim,
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  )
};
