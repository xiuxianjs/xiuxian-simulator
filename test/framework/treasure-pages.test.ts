import assert from 'node:assert/strict';
import { after, test, type TestContext } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import handler from '../../src/response/treasures/res';
import { businessEnvelope, gameFixture } from './fixture';

after(async () => shutdownLogger());
const zero = { physicalAttack: 0, magicAttack: 0, physicalDefense: 0, magicDefense: 0, hp: 0 };
function item(id: number, rarity = Math.floor(id / 100), owned = true) {
  return {
    definition: {
      id,
      name: `宝物${id}`,
      rarity,
      rarityName: ['普通', '优秀', '精良', '稀有', '史诗', '神话'][rarity - 1],
      baseAttributes: zero,
      perLevelAttributes: zero,
      basePercentAttributes: zero,
      effectDescription: rarity >= 4 ? `生活效果${id}` : '',
      stageValues: [] as string[],
      maxGrade: rarity >= 5 ? 24 : 15,
      weight: 1
    },
    owned,
    grade: owned ? 1 : 0,
    gradeName: owned ? '星尘1' : '',
    level: owned ? 1 : 0,
    fragments: owned ? 0 : 9,
    duplicates: 0,
    attributes: { ...zero, hp: id },
    percentAttributes: { ...zero, hp: 0.5 },
    currentEffect: rarity >= 4 ? '5%' : '',
    nextLevelCost: 100,
    promotion: null as { duplicates: number; xianYun: number; requirements: string[] } | null,
    canUpgrade: owned,
    canPromote: false
  };
}
const overview = (items: ReturnType<typeof item>[]) => ({
  experience: 100,
  xianYun: 5,
  levelCap: 10,
  version: 1,
  decompositionValues: [],
  records: [],
  fortune: { score: 1, level: 1, maxLevel: 20, nextThreshold: 3 as number | null, bonus: { critRate: 1, hitRate: 1, dodgeRate: 1, critDamage: 5 } },
  items
});

function view(result: TestRunResult) {
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];

  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const walk = (nodes: unknown[]) => {
    for (const raw of nodes) {
      if (!raw || typeof raw !== 'object') continue;
      const node = raw as Record<string, unknown>;

      if (node.type === 'MD.button') {
        assert.equal((node.options as Record<string, unknown>)?.autoEnter, false);
      }
      if (Array.isArray(node.value)) walk(node.value);
    }
  };

  walk(message.nodes);
  assert.ok(!JSON.stringify(message.nodes).includes('show='));

  return inspectMessage(message.nodes);
}

async function run(t: TestContext, data: ReturnType<typeof overview>, command: string) {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const result = view(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })));

  assert.equal(requests.length, 1);
  assert.ok(requests[0].path.endsWith('/treasures.overview'));

  return result;
}

test('宝物默认普通，仅显示当前档已激活主件，气运不混入总览', async t => {
  const result = await run(t, overview([item(101), item(401), item(601, 6, false)]), '/宝物');

  assert.match(result.text, /宝物101/);
  assert.match(result.text, /星尘1 · Lv\.1/);
  assert.doesNotMatch(result.text, /宝物401|宝物601|鸿蒙气运 1\/20级|碎片/);
  assert.ok(result.commands.includes('/宝物 品质 1'));
  assert.ok(result.commands.includes('/宝物 品质 4'));
  assert.ok(!result.commands.includes('/宝物 品质 6'));
  assert.ok(result.commands.includes('/宝物 详情 101'));
  assert.ok(result.commands.includes('/宝物 一键突破'));
  assert.ok(result.commands.includes('/宝物 一键升级'));
});

test('无普通时默认最低已有档，空账户和指定未拥有档有明确空态', async t => {
  const owned = overview([item(301), item(501), item(101, 1, false)]);
  const defaultView = await run(t, owned, '/宝物');

  assert.match(defaultView.text, /宝物301/);
  assert.doesNotMatch(defaultView.text, /宝物501|宝物101/);
  const missing = await run(t, owned, '/宝物 品质 1');

  assert.match(missing.text, /尚未拥有普通宝物/);
  assert.doesNotMatch(missing.text, /宝物301|宝物501/);
  const empty = await run(t, overview([item(401, 4, false)]), '/宝物');

  assert.match(empty.text, /尚未拥有宝物/);
  assert.doesNotMatch(empty.text, /宝物401|碎片/);
  assert.ok(!empty.commands.some(command => command.startsWith('/宝物 品质 ')));
});

test('品质筛选只列对应档，6件分页保留所选品质', async t => {
  // A larger same-rarity catalog verifies pagination without changing the live catalog.
  const data = overview([...Array.from({ length: 7 }, (_, index) => item(101 + index)), item(401)]);
  const first = await run(t, data, '/宝物 品质 1');

  assert.match(first.text, /第 1\/2 页/);
  assert.ok(first.commands.includes('/宝物 品质 1 p2'));
  assert.ok(!first.commands.includes('/宝物 详情 107'));
  assert.equal(first.commands.filter(command => command.startsWith('/宝物 详情 ')).length, 6);
  const second = await run(t, data, '/宝物 品质 1 p2');

  assert.match(second.text, /宝物107/);
  assert.doesNotMatch(second.text, /宝物101|宝物401/);
  assert.ok(second.commands.includes('/宝物 品质 1 p1'));
  const purple = await run(t, data, '/宝物 品质 4');

  assert.match(purple.text, /宝物401/);
  assert.doesNotMatch(purple.text, /宝物101|宝物107/);
});

test('鸿蒙气运独立展示两页导航，满级不计算虚构的下级差额', async t => {
  const data = overview([item(101)]);
  const result = await run(t, data, '/宝物 气运');

  assert.match(result.text, /根据宝物培养程度，气运会逐渐累积/);
  assert.match(result.text, /鸿蒙气运 1\/20级 · 积分 1/);
  assert.match(result.text, /下级累计 3 分 · 还差 2 分/);
  assert.match(result.text, /当前效果：\n> 命中率 \+1% · 闪避率 \+1%\n> 暴击率 \+1% · 暴伤 \+5%/);
  assert.doesNotMatch(result.text, /宝物101|宝物经验/);
  data.fortune = { ...data.fortune, level: 20, score: 350, nextThreshold: null };
  const max = await run(t, data, '/宝物 气运');

  assert.match(max.text, /已达最高气运等级/);
  assert.doesNotMatch(max.text, /下级累计|还差/);
});

test('效果总览只汇总已拥有宝物的战斗属性与当前生活效果', async t => {
  const data = overview([item(101), item(504), item(604, 6, false)]);
  data.items[1].currentEffect = '炼丹时，5%概率返还本炉整份实际消耗药材。';
  const result = await run(t, data, '/宝物 效果');

  assert.match(result.text, /生命 \+605/);
  assert.match(result.text, /生命 \+1%/);
  assert.match(result.text, /宝物504\n> 炼丹时，5%概率返还本炉整份实际消耗药材。/);
  assert.doesNotMatch(result.text, /生活效果504|当前：5%/);
  assert.doesNotMatch(result.text, /宝物604|生活效果604|生命 \+1,209/);
  assert.ok(result.commands.includes('/宝物 气运'));
});

function shennong() {
  const base = item(504);
  const effect = '正常原炉成功失败均可，命中返还本炉整份实际消耗药材';

  return {
    ...base,
    definition: {
      ...base.definition,
      name: '神农鼎',
      baseAttributes: { ...zero, hp: 600 },
      perLevelAttributes: { ...zero, hp: 12 },
      effectDescription: effect,
      stageValues: ['5%', '10%', '15%', '20%']
    },
    gradeName: '星尘1阶',
    attributes: { ...zero, hp: 600 },
    percentAttributes: { ...zero, hp: 2 },
    currentEffect: '炼丹时，5%概率返还本炉整份实际消耗药材。',
    fragments: 2,
    duplicates: 1,
    nextLevelCost: 20,
    promotion: { duplicates: 1, xianYun: 0, requirements: [] },
    canUpgrade: false,
    canPromote: false,
    upgradePreview: { grade: 1, gradeName: '星尘1阶', level: 2, attributes: { ...zero, hp: 612 }, percentAttributes: { ...zero, hp: 2 } },
    promotionPreview: { grade: 2, gradeName: '星尘2阶', level: 1, attributes: { ...zero, hp: 780 }, percentAttributes: { ...zero, hp: 2 } }
  };
}

test('详情培养只展示当前特效，变化与消耗均使用服务端预览，资源不足仍可打开确认', async t => {
  const result = await run(t, overview([shennong()]), '/宝物 详情 504');

  assert.match(result.text, /当前拥有：经验 100 · 仙蕴 5/);
  assert.match(result.text, /【史诗】神农鼎/);
  assert.doesNotMatch(result.text, /504 神农鼎|星尘1阶|晓月|真阳|仙藏/);
  assert.match(result.text, /星尘1 · 等级 1\/10/);
  assert.match(result.text, /5%概率返还本炉整份实际消耗药材/);
  assert.match(result.text, /升品至 星尘2/);
  assert.match(result.text, /生命 \+600 → 生命 \+780/);
  assert.match(result.text, /需要本体 1 · 仙蕴 0/);
  assert.match(result.text, /升级至 Lv\.2/);
  assert.match(result.text, /生命 \+600 → 生命 \+612/);
  assert.match(result.text, /需要经验 20/);
  assert.doesNotMatch(result.text, /生命 \+2% →|生命 \+601|生命 \+620/);
  assert.ok(result.commands.includes('/宝物 升品 504'));
  assert.ok(result.commands.includes('/宝物 升级 504'));
});

test('详情采用服务器返回的下一状态，不用本地倍率或等级增量猜测', async t => {
  const entry = shennong();

  entry.promotionPreview.attributes.hp = 825;
  entry.upgradePreview.attributes.hp = 617.25;
  entry.nextLevelCost = 37;
  const result = await run(t, overview([entry]), '/宝物 详情 504');

  assert.match(result.text, /生命 \+600 → 生命 \+825/);
  assert.match(result.text, /生命 \+600 → 生命 \+617\.25/);
  assert.match(result.text, /需要经验 37/);
  assert.doesNotMatch(result.text, /生命 \+780|生命 \+612/);
});

test('旧响应缺少下一状态时不伪造属性，满境界等级和满品不提供可执行培养按钮', async t => {
  const legacy = { ...shennong(), upgradePreview: undefined, promotionPreview: undefined };
  const result = await run(t, overview([legacy]), '/宝物 详情 504');

  assert.match(result.text, /刷新后查看下一阶属性/);
  assert.doesNotMatch(result.text, /生命 \+600 →/);
  assert.ok(!result.commands.some(command => /\/宝物 (升级|升品) /.test(command)));
  legacy.level = 10;
  legacy.grade = 24;
  const capped = await run(t, overview([legacy]), '/宝物 详情 504');

  assert.match(capped.text, /等级已达当前境界上限/);
  assert.match(capped.text, /品级已达上限/);
  assert.ok(!capped.commands.some(command => /\/宝物 (升级|升品) /.test(command)));
});

test('未拥有详情只显示未拥有及当前碎片，修为加成仍按加成文字展示', async t => {
  const absent = await run(t, overview([item(604, 6, false)]), '/宝物 详情 604');

  assert.match(absent.text, /尚未拥有/);
  assert.match(absent.text, /碎片 9\/10/);
  assert.doesNotMatch(absent.text, /战斗属性|特殊属性|升品至|升级至/);
  assert.ok(!absent.commands.some(command => /\/宝物 (升级|升品) /.test(command)));
  const cultivation = shennong();

  cultivation.definition.effectDescription = '所有修为获取提高';
  cultivation.currentEffect = '所有修为获取提高（5%）';
  const gain = await run(t, overview([cultivation]), '/宝物 详情 504');

  assert.match(gain.text, /所有修为获取提高（5%）/);
  assert.doesNotMatch(gain.text, /5%概率/);
});
