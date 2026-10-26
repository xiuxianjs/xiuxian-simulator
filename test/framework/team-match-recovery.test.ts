import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import mainline from '../../src/response/teamMatch/startMainline/res';
import dungeon from '../../src/response/teamMatch/startDungeon/res';
import snapshot from '../../src/response/teamMatch/status/res';
import cancel from '../../src/response/teamMatch/cancel/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const cases = [
  { handler: mainline, command: "/匹配主线 7-3", reason: "玩家已经在队伍中", expected: "/我的队伍", text: "已有队伍不能再发起匹配" },
  { handler: dungeon, command: "/匹配秘境 5", reason: "玩家已经在队伍中", expected: "/我的队伍", text: "当前队伍和目标" },
  { handler: mainline, command: "/匹配主线 7-3", reason: "已在匹配中，请先取消", expected: "/匹配状态", text: "重复发起不会更换现有匹配" },
  { handler: dungeon, command: "/匹配秘境 5", reason: "已在匹配中，请先取消\n\n道友，你是来找我玩的吗", expected: "/匹配状态", text: "继续等待" },
  { handler: mainline, command: "/匹配主线 7-3", reason: "境界不足，主线 7-3 需要更高境界", expected: "/查看主线", text: "挑战主线获取修为" },
  { handler: dungeon, command: "/匹配秘境 5", reason: "境界不足，秘境 灵溪 需要更高境界", expected: "/我的境界", text: "核对当前修为和所需材料" },
  { handler: dungeon, command: "/匹配秘境 5", reason: "境界过高，秘境 灵溪 当前无法匹配", expected: "/查看秘境", text: "继续提升境界不能解除这项限制" },
  { handler: dungeon, command: "/匹配秘境 5", reason: "该秘境为单人秘境，无法发起组队匹配", expected: "/查看秘境", text: "单人挑战入口" },
  { handler: mainline, command: "/匹配主线 7-3", reason: "关卡 7-3 不存在", expected: "/查看主线", text: "真实章节号和关卡号" },
  { handler: mainline, command: "/匹配主线", reason: "请提供章节关卡号，例如 26-4", expected: "/查看主线", text: "示例编号不代表已开放目标" },
  { handler: mainline, command: "/匹配主线 abc", reason: "章节关卡号格式不正确，应为 章节号-关卡号（如 26-4）", expected: "/查看主线", text: "章节号-关卡号" },
  { handler: mainline, command: "/匹配主线 0-3", reason: "mode 与 targetId，或主线 chapterNumber/stageNumber 必填", expected: "/查看主线", text: "真实章节号和关卡号" },
  { handler: mainline, command: "/匹配主线 9999999999999999999999999-3", reason: "匹配编号超出支持范围", expected: "/查看主线", text: "示例编号不代表已开放目标" },
  { handler: dungeon, command: "/匹配秘境", reason: "请提供秘境ID", expected: "/查看秘境", text: "真实编号及组队条件" },
  { handler: dungeon, command: "/匹配秘境 abc", reason: "秘境ID必须是大于 0 的数字", expected: "/查看秘境", text: "不能用章节关卡号代替秘境编号" },
  { handler: dungeon, command: "/匹配秘境 0", reason: "mode 与 targetId，或主线 chapterNumber/stageNumber 必填", expected: "/查看秘境", text: "真实编号及组队条件" },
  { handler: snapshot, command: "/匹配状态", reason: "匹配记录格式无效", expected: "/我的队伍", text: "不能证明异常队列记录已经清除" },
  { handler: cancel, command: "/取消匹配", reason: "匹配记录格式无效", expected: "/我的队伍", text: "没有有效快照不代表匹配失败" }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} private=${isPrivate} ${mode} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http'
      ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '副本匹配', heading: '', text: entry.reason, buttons: [], advice: [] }]),
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
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.some(command => /^\/(?:匹配主线|匹配秘境|取消匹配|离开队伍)(?:\s|$)/.test(command)));
    if (/境界过高/.test(entry.reason)) assert.ok(!view.text.includes('挑战主线获取修为'));
    assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}



for (const entry of [
  { handler: snapshot, command: '/匹配状态', data: null, text: '当前未查到有效匹配记录' },
  { handler: cancel, command: '/取消匹配', data: { cancelled: false, targetLabel: null }, text: '本次未取消有效匹配记录' },
  { handler: cancel, command: '/取消匹配', data: { cancelled: true, targetLabel: '主线 7-3' }, text: '已取消匹配：主线 7-3' }
]) for (const isPrivate of [false, true]) {
  test(`查询空快照与取消结果分开展示 ${entry.text} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, entry.data));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(entry.text));
    assert.ok(view.commands.includes('/我的队伍'));
    assert.ok(!view.commands.includes('/取消匹配'));
    assert.ok(!view.text.includes('你当前不在匹配中'));
    assert.ok(view.text.includes(entry.data?.cancelled ? '不会解散已经形成的队伍' : '不能证明异常队列记录已经清除'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const [waitedSeconds, phase] of [[0, 'WAITING'], [30, 'SAME_REALM'], [90, 'ADJACENT_REALM'], [150, 'NEAREST_REALM'], [180, 'NEAREST_REALM'], [250, 'NEAREST_REALM']] as const) for (const isPrivate of [false, true]) {
  test(`快照不驱动队列或伪造结算 ${phase} ${waitedSeconds} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { targetLabel: '秘境 灵溪', waitedSeconds, timeoutSeconds: 180, phase }));
    const event = isPrivate ? app.events.privateMessage({ text: '/匹配状态', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/匹配状态', platform: 'qq-bot' });
    const result = await app.runHandler(snapshot, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(`已等待：${waitedSeconds}秒`));
    assert.ok(view.text.includes('时限：180秒'));
    assert.ok(view.commands.includes('/取消匹配'));
    assert.equal(view.text.includes('已达到提示时限'), waitedSeconds >= 180);
    if (waitedSeconds >= 180) assert.ok(view.commands.includes('/我的队伍'));
    assert.ok(!view.text.includes('匹配成功'));
    assert.ok(!view.text.includes('战斗胜利'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of [{ handler: mainline, command: '/匹配主线 7 － 3' }, { handler: dungeon, command: '＃匹配秘境 5' }]) for (const isPrivate of [false, true]) {
  test(`成功入池仅保留原目标和查询取消入口 ${entry.command} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { targetLabel: '真实目标' }));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].idempotencyKey);
    assert.deepEqual(requests[0].body.arguments, { input: entry.handler === mainline ? '7 － 3' : '5' });
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('已进入匹配'));
    assert.ok(view.text.includes('真实目标'));
    for (const command of ['/匹配状态', '/取消匹配']) assert.ok(view.commands.includes(command));
    assert.ok(!view.text.includes('匹配成功'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of [
  { handler: mainline, command: '/匹配主线 7-3', text: '队伍匹配服务尚未配置' },
  { handler: dungeon, command: '/匹配秘境 5', text: '匹配 Redis 未配置' },
  { handler: snapshot, command: '/匹配状态', text: '匹配记录读取失败' }
]) {
  test(`服务异常不推断玩家资源或队伍状态 ${entry.text}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '副本匹配', heading: '', text: entry.text, buttons: [], advice: [] }]));
    const result = await app.runHandler(entry.handler, app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(entry.text));
    assert.ok(!view.text.includes('建议：'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const entry of [
  { handler: mainline, command: '/匹配主线 7-3' },
  { handler: dungeon, command: '/匹配秘境 5' },
  { handler: snapshot, command: '/匹配状态' },
  { handler: cancel, command: '/取消匹配' }
]) for (const isPrivate of [false, true]) {
  test(`自定义匹配气泡保留服务端原建议和按钮 ${entry.command} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
      title: '副本匹配', heading: '', text: '匹配状态需要核对',
      buttons: [{ label: '查看当前匹配', command: '/匹配状态' }],
      advice: [{ command: '/我的队伍', description: '服务端给出的队伍核对建议' }]
    }]));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('匹配状态需要核对'));
    assert.equal(view.text.split('服务端给出的队伍核对建议').length - 1, 1);
    for (const command of ['/我的队伍', '/匹配状态']) assert.ok(view.commands.includes(command));
    assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
