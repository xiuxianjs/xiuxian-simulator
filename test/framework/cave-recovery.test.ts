import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import action from '../../src/response/cavePlot/action/res';
import plant from '../../src/response/cavePlot/plant/res';
import cultivate from '../../src/response/cavePlot/cultivate/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const cases = [
  { handler: cultivate, command: '/开垦 2', reason: '第2块灵田尚未解锁，当前不能直接开垦', commands: ['/灵田'], text: '解锁' },
  { handler: cultivate, command: '/开垦', reason: '当前没有可开垦的灵田', commands: ['/灵田'], text: '职业条件' },
  { handler: cultivate, command: '/开垦 2', reason: '第2块灵田已经开垦完成', commands: ['/灵田'], text: '不重复开垦' },
  { handler: cultivate, command: '/开垦 2', reason: '未找到对应灵田地块', commands: ['/灵田'], text: '有效地块编号' },
  { handler: cultivate, command: '/一键开垦', reason: '材料不足，本次未消耗材料：\n灵锄 x2\n灵土 x3', commands: ['/灵田', '/储物袋'], text: '总消耗' },
  { handler: plant, command: '/播种 2 凝气草', reason: '第2块灵田尚未开垦，当前不能播种', commands: ['/灵田'], text: '是否已开垦' },
  { handler: plant, command: '/播种 2 凝气草', reason: '第2块灵田已种有凝气草', commands: ['/灵田'], text: '不能被新播种覆盖' },
  { handler: plant, command: '/播种 凝气草', reason: '当前没有可播种的空闲灵田', commands: ['/灵田'], text: '成熟时间' },
  { handler: plant, command: '/播种 2 凝气草', reason: '灵种数量不足', commands: ['/灵田', '/储物袋'], text: '缺失名称和数量' },
  { handler: plant, command: '/播种 2 未知灵种', reason: '未识别该灵种名称', commands: ['/播种'], text: '当前灵种列表' },
  { handler: plant, command: '/播种 2 凝气草', reason: '播种灵田参数无效', commands: ['/灵田'], text: '有效地块编号' },
  { handler: action, command: '/升级灵田 2', reason: '当前没有可升级的灵田', commands: ['/灵田'], text: '当前品阶' },
  { handler: action, command: '/升级灵田 2', reason: '当前灵药师阶段无法继续升级该灵田', commands: ['/我的职业'], text: '职业成长与人物境界不同' },
  { handler: action, command: '/收割 2', reason: '当前没有可收割的成熟灵植', commands: ['/灵田'], text: '成熟时间' },
  { handler: action, command: '/浇灌 2', reason: '当前灵田没有可照料的未成熟作物', commands: ['/灵田'], text: '无需重复照料' },
  { handler: action, command: '/除虫', reason: '当前没有可处理的对应异常灵田', commands: ['/灵田'], text: '当前存在的' },
  { handler: action, command: '/除草', reason: '当前没有可处理的对应异常灵田', commands: ['/灵田'], text: '当前存在的' },
  { handler: action, command: '/灵田加速 2 灵肥 1', reason: '灵肥不足。', commands: ['/灵田', '/储物袋'], text: '缺失名称和数量' },
  { handler: action, command: '/灵田加速 2 小绿瓶 1', reason: '小绿瓶不足。', commands: ['/我的信息', '/灵田'], text: '小绿瓶是个人资源' },
  { handler: action, command: '/灵田加速 2 灵肥 1', reason: '该灵种本轮最多可使用 3 次加速道具（灵肥/小绿瓶）。', commands: ['/灵田'], text: '购买更多道具不能增加额度' },
  { handler: action, command: '/灵田加速 2 灵石 1', reason: '本轮普通加速次数已用完', commands: ['/灵田'], text: '其他方式能否使用' },
  { handler: action, command: '/灵田加速 2 催熟 1', reason: '该地块24小时内已使用立即催熟', commands: ['/灵田'], text: '等待冷却恢复' },
  { handler: action, command: '/灵田加速 2 灵石 1', reason: '冻结阵法生效中，请先解除冻结', commands: ['/洞府阵法'], text: '不自动移除阵法' },
  { handler: action, command: '/灵田加速 2 灵肥 1', reason: '当前没有可加速的灵植。', commands: ['/灵田'], text: '无需再购买加速物资' },
  { handler: action, command: '/灵田加速', reason: '请指定灵田编号，例如：/灵田加速 1', commands: ['/灵田'], text: '先查看该地块预览' }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} private=${isPrivate} ${mode} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http'
      ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '灵田提示', heading: '', text: entry.reason, buttons: [], advice: [] }]),
    mode === 'http' ? 409 : 200);
    const event = isPrivate
      ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' })
      : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(entry.reason));
    assert.ok(view.text.includes(entry.text), view.text);
    for (const command of entry.commands) assert.ok(view.commands.includes(command), JSON.stringify(view));
    assert.ok(!view.commands.some(command => /^\/(?:开垦|播种|收割|浇灌|除虫|除草|升级灵田|灵田加速|移除阵法)\s/.test(command)));
    assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const isPrivate of [false, true]) {
  test(`加速预览保留冻结原因并给阵法入口 private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
      mode: 'preview', preview: {
        found: true, message: '第2块灵田尚余约 60 分钟成熟，本轮已加速 0/3 次。', plotIndex: 2,
        greenBottleUsedCount: 0, greenBottleLimit: 3, remainingSeconds: 3600, remainingHours: 1,
        lingfeiCount: 0, greenBottleCount: 0, remainingSlots: 3, maxLingfei: 0, maxGreenBottle: 0,
        spiritStoneEnabled: true, spiritStone: 100, stoneCost: 0, maxSpiritStone: 0,
        ripenCost: 0, canRipen: false, stoneReason: '冻结阵法生效中，请先解除冻结'
      }
    }));
    const event = isPrivate
      ? app.events.privateMessage({ text: '/灵田加速 2', platform: 'qq-bot' })
      : app.events.groupMessage({ text: '/灵田加速 2', platform: 'qq-bot' });
    const result = await app.runHandler(action, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('冻结阵法生效中，请先解除冻结'));
    assert.ok(view.text.includes('本轮已加速 0/3 次'));
    assert.ok(view.text.includes('不自动移除阵法'));
    assert.ok(view.commands.includes('/洞府阵法'));
    assert.ok(!view.commands.some(command => /^\/(?:灵田加速|移除阵法)\s/.test(command)));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
  test(`成功查询但没有可加速作物 private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
      mode: 'preview', preview: { found: false, message: '当前灵田没有可加速的未成熟灵植。' }
    }));
    const event = isPrivate
      ? app.events.privateMessage({ text: '/灵田加速 2', platform: 'qq-bot' })
      : app.events.groupMessage({ text: '/灵田加速 2', platform: 'qq-bot' });
    const result = await app.runHandler(action, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('无需再购买加速物资'));
    assert.ok(view.commands.includes('/灵田'));
    assert.ok(!view.commands.includes('/商店 万宝楼'));
    assert.ok(!view.commands.some(command => command.startsWith('/灵田加速 ')));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const reason of ['该灵植数据异常，暂时无法加速。', '作物物品配置缺失', '灵石种田尚未完成数据库升级']) {
  test(`灵田内部异常不推断成材料不足：${reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
      title: '灵田提示', heading: '', text: reason, buttons: [], advice: []
    }]));
    const result = await app.runHandler(action, app.events.privateMessage({ text: '/灵田加速 2', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(reason));
    assert.doesNotMatch(view.text, /建议：/);
    assert.ok(view.text.includes('结果未知时也不能断定未执行'));
    for (const command of ['/灵田', '/储物袋']) assert.ok(view.commands.includes(command));
    assert.ok(!view.text.includes('补足'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
