import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import apply from '../../src/response/guild/joinGuild/res';
import create from '../../src/response/guild/createGuild/res';
import approve from '../../src/response/guild/approveApplication/res';
import reject from '../../src/response/guild/rejectApplication/res';
import cancel from '../../src/response/guild/cancelApplication/res';
import transfer from '../../src/response/guild/transferLeader/res';
import appoint from '../../src/response/guild/appointRole/res';
import kick from '../../src/response/guild/kickMember/res';
import leave from '../../src/response/guild/leaveGuild/res';
import leaveLeader from '../../src/response/guild/leaderLeave/res';
import checkin from '../../src/response/guild/checkin/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const cases = [
  { handler: apply, command: '/加入宗门 2', reason: '宗门人数已满', expected: '/宗门列表', text: '不能增加该宗门名额' },
  { handler: apply, command: '/加入宗门 2', reason: '待审核申请已达上限', expected: '/我的申请', text: '不自动取消或重复申请' },
  { handler: apply, command: '/加入宗门 2', reason: '已经申请过该宗门', expected: '/我的申请', text: '仍待审核' },
  { handler: apply, command: '/加入宗门 2', reason: '已经加入宗门', expected: '/我的宗门', text: '不为重试自动退出' },
  { handler: create, command: '/创建宗门 测试宗', reason: '已加入宗门，无法创建', expected: '/我的宗门', text: '已有成员身份' },
  { handler: create, command: '/创建宗门 测试宗', reason: '宗门名称需为2至6字', expected: '/宗门列表', text: '符合长度和字符要求' },
  { handler: create, command: '/创建宗门 测试宗', reason: '宗门名称只能包含中文、字母或数字', expected: '/宗门列表', text: '符合长度和字符要求' },
  { handler: create, command: '/创建宗门 测试宗', reason: '宗门名称已存在', expected: '/宗门列表', text: '名称被占用' },
  { handler: create, command: '/创建宗门 测试宗', reason: '宗门名称包含不适当的内容', expected: '/宗门列表', text: '由你重新命名' },
  { handler: apply, command: '/加入宗门 2', reason: '宗门要求最低境界为：筑基初期', expected: '/查看主线', text: '核对突破条件' },
  { handler: approve, command: '/宗门审核同意 9', reason: '申请人处于退出宗门冷却期', expected: '/宗门审核', text: '限制属于申请人' },
  { handler: approve, command: '/宗门审核同意 9', reason: '申请人已加入其他宗门', expected: '/宗门审核', text: '自动拒绝该申请' },
  { handler: approve, command: '/宗门审核同意 9', reason: '宗门人数已满（8/8），无法通过申请', expected: '/宗门成员列表', text: '先核对审核结果' },
  { handler: approve, command: '/宗门审核同意 9', reason: '未找到该玩家的待审核申请', expected: '/宗门审核', text: '当前待审核' },
  { handler: reject, command: '/宗门审核拒绝 9', reason: '未找到该玩家的待审核申请', expected: '/宗门审核', text: '不猜测或重复提交' },
  { handler: approve, command: '/宗门审核同意 9', reason: '不能审核自己的入宗申请', expected: '/宗门审核', text: '不能审核本人' },
  { handler: cancel, command: '/取消宗门申请 2', reason: '申请记录不存在或已处理', expected: '/我的申请', text: '已处理记录不能再次取消' },
  { handler: transfer, command: '/宗主转让 1', reason: '只有宗主才能转让宗主职位', expected: '/我的宗门', text: '不通过重复提交或提升人物境界' },
  { handler: transfer, command: '/宗主转让 1', reason: '宗主转让冷却中，还需等待3天', expected: '/我的宗门', text: '按原提示的剩余时间' },
  { handler: transfer, command: '/宗主转让 1', reason: '宗门中没有其他成员，无法转让', expected: '/宗门成员列表', text: '继任/代理资格' },
  { handler: transfer, command: '/宗主转让 1', reason: '目标成员不在本宗门中', expected: '/宗门成员列表', text: '当前成员' },
  { handler: transfer, command: '/宗主转让 1', reason: '不能转让给自己', expected: '/宗门成员列表', text: '核对目标' },
  { handler: transfer, command: '/宗主转让 9', reason: '编号无效，请输入 1~3', expected: '/宗主转让', text: '不等同玩家 UID' },
  { handler: appoint, command: '/设置身份为 宗师 9', reason: '职位不存在', expected: '/宗门改职', text: '当前可用职位' },
  { handler: appoint, command: '/设置身份为 宗师 9', reason: '职位【宗师】不存在', expected: '/宗门改职', text: '当前可用职位' },
  { handler: appoint, command: '/设置身份为 长老 9', reason: '您不能任命长老职位，只能任命比自己低的职位', expected: '/我的宗门', text: '可授予职位' },
  { handler: appoint, command: '/设置身份为 长老 9', reason: '长老职位未开放，请提升宗门等级以解锁', expected: '/我的宗门', text: '职位开放由宗门等级决定' },
  { handler: appoint, command: '/设置身份为 长老 9', reason: '长老名额已满（2人）', expected: '/宗门成员列表', text: '不自动踢人' },
  { handler: appoint, command: '/设置身份为 长老 9', reason: '【道友】当前不允许被更新职位，可能因为参加宗门大比等原因', expected: '/宗门成员列表', text: '不自动退赛' },
  { handler: kick, command: '/踢出成员 9', reason: '没有执行该操作的权限', expected: '/我的宗门', text: '本人职位与当前权限' },
  { handler: kick, command: '/踢出成员 9', reason: '不能踢出自己', expected: '/宗门成员列表', text: '本宗门当前成员' },
  { handler: leave, command: '/退出宗门', reason: '宗门没有可继任成员，如需离开请使用解散宗门指令', expected: '/宗门成员列表', text: '不自动踢人、退宗或解散' },
  { handler: leaveLeader, command: '/宗主请假', reason: '只有宗主才能请假', expected: '/我的宗门', text: '本人职位' },
  { handler: leaveLeader, command: '/宗主请假', reason: '本周已经请过假，下周一（2026/10/26）后可再次请假', expected: '/我的宗门', text: '下次开放日期等待' },
  { handler: leaveLeader, command: '/宗主请假', reason: '您正在请假中（至2026/10/24）', expected: '/我的宗门', text: '请假有效期' },
  { handler: leaveLeader, command: '/宗主请假', reason: '没有合适的代理人，无法请假', expected: '/宗门成员列表', text: '继任/代理资格' },
  { handler: checkin, command: '/宗门签到', reason: '你还未加入任何宗门', expected: '/宗门列表', text: '申请成功不等于已成为成员' },
  { handler: leave, command: '/退出宗门', reason: '尚未加入宗门', expected: '/宗门列表', text: '仍需审核' }
];

for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} private=${isPrivate} ${mode} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http'
      ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '宗门提示', heading: '', text: entry.reason, buttons: [], advice: [] }]),
    mode === 'http' ? 409 : 200);
    app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'No mentions', [])]);
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
    assert.ok(!view.commands.some(command => /^\/(?:宗门审核同意|宗门审核拒绝|设置身份为|退出宗门|解散宗门|踢出成员|加入宗门|创建宗门|取消宗门申请)(?:\s|$)/.test(command)));
    assert.ok(!view.commands.some(command => /^\/宗主转让\s/.test(command)));
    if (entry.reason.startsWith('申请人')) assert.ok(!view.commands.includes('/我的境界'));
    assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const [handler, base] of [[approve, '/宗门审核同意'], [reject, '/宗门审核拒绝']] as const) {
  for (const suffix of ['', ' 9']) for (const isPrivate of [false, true]) {
    test(`无目标或目标无法解析仍有反馈 ${base}${suffix} private=${isPrivate}`, async t => {
      const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { outcome: 'no_target' }));
      app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'No mentions', [])]);
      const event = isPrivate
        ? app.events.privateMessage({ text: base + suffix, platform: 'qq-bot' })
        : app.events.groupMessage({ text: base + suffix, platform: 'qq-bot' });
      const result = await app.runHandler(handler, event);
      assert.equal(requests.length, 1);
      assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      const view = inspectMessage(message.nodes);
      assert.ok(view.text.includes('未能确定审核对象'));
      assert.ok(view.commands.includes('/宗门审核'));
      assert.ok(!view.text.includes('审核成功'));
      assert.ok(!view.commands.some(command => /^\/宗门审核(?:同意|拒绝)/.test(command)));
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    });
  }
}

test('自动拒绝保留审核失败标题、原因和原返回按钮', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
    title: '', heading: '❌ 审核失败', text: '申请人处于退出宗门冷却期',
    buttons: [{ label: '返回审核列表', command: '/宗门审核' }], advice: []
  }]));
  const result = await app.runHandler(approve, app.events.groupMessage({ text: '/宗门审核同意 9', platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  const view = inspectMessage(message.nodes);
  assert.ok(view.text.includes('❌ 审核失败'));
  assert.ok(view.text.includes('申请人处于退出宗门冷却期'));
  assert.ok(view.text.includes('限制属于申请人'));
  assert.ok(view.commands.includes('/宗门审核'));
  assert.ok(!view.commands.includes('/退出宗门'));
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});

for (const reason of ['弟子职位配置不存在', '宗门服务未初始化', '宗门数据异常']) {
  test(`宗门内部异常不当成玩家权限或成长不足：${reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
      title: '宗门提示', heading: '', text: reason, buttons: [], advice: []
    }]));
    const result = await app.runHandler(approve, app.events.privateMessage({ text: '/宗门审核同意 9', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(reason));
    assert.ok(!view.text.includes('建议：'));
    assert.ok(!view.commands.includes('/我的境界'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
