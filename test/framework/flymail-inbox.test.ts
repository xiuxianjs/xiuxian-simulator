import muteHandler from '../../src/response/flyMail/mute/res';
import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import handler from '../../src/response/flyMail/home/res';
import { parseFlyMailHomeCommand } from '../../src/utils/flyMailCommand';
import { parseRobotFriendInbox } from '../../src/api/bot/fly-mail-queries';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const base = { scope: 'friend', page: 1, total: 0, totalPage: 1, access: { allowed: true, realmName: '炼气五层', realmLevel: 5 }, muteList: [], list: [] };
const summary = (id: number) => ({ id, targetUid: id + 100, targetName: `道友${id}`, preview: `会话${id}最新摘要`, lastMessageAt: '2026-10-20T09:00:00+08:00' });
const inbox = (page = 1) => ({ ...base, page, total: 6, totalPage: 2, view: 'conversations', conversation: null, conversations: (page === 1 ? [41, 42, 43, 44, 45] : [46]).map(summary) });
const message = (id: number, scope = 'friend') => ({ kind: 'message', id, scope, senderUid: id % 2 ? 141 : 1, senderName: id % 2 ? '道友41' : '我', content: `会话41记录${id}`, createdAt: '2026-10-20T09:00:00+08:00', conversationId: 41, title: '' });
const thread = (page = 1) => ({ ...base, page, total: 6, totalPage: 2, view: 'messages', conversation: { id: 41, targetUid: 141, targetName: '道友41' }, conversations: [], list: (page === 1 ? [6, 5, 4, 3, 2] : [1]).map(id => message(id)) });

for (const privateChat of [true]) {
  test(`好友先列会话，打开后显示独立历史并保留会话分页（${privateChat ? '私聊' : '群聊'}）`, async t => {
    const { app, requests } = await gameFixture(t, r => {
      const args = r.body.arguments as Record<string, unknown>;
      return businessEnvelope(r.bid, args.view === 'messages' ? thread(Number(args.page)) : inbox(Number(args.page)));
    });
    const event = (text: string) => privateChat ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const first = await app.runHandler(handler, event('/飞信'));
    assert.equal(first.messages.length, 1);
    assert.equal(first.actions[first.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(first.messages[0].nodes);
    assert.deepEqual(requests[0].body.arguments, { scope: 'friend', page: '1', view: 'conversations' });
    assert.match(view.text, /会话41最新摘要/);
    assert.doesNotMatch(view.text, /会话41记录/);
    assert.ok(view.commands.includes('/飞信 2'));
    const open = view.commands.find(c => c === '/飞信 会话 41'); assert.ok(open);
    assert.equal(view.commands.filter(c => c.startsWith('/飞信 会话 ')).length, 5);
    const detail = await app.runHandler(handler, event(open));
    assert.equal(detail.messages.length, 1);
    assert.equal(detail.actions[detail.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    assert.deepEqual(requests[1].body.arguments, { scope: 'friend', page: '1', view: 'messages', conversationId: '41' });
    const history = inspectMessage(detail.messages[0].nodes);
    assert.match(history.text, /会话41记录6/);
    assert.doesNotMatch(history.text, /会话42|最新摘要/);
    assert.ok(history.commands.includes('/飞信'));
    assert.ok(history.commands.includes('/发飞信 141 '));
    assert.ok(!history.commands.includes('/发飞信 1 '));
    const next = history.commands.find(c => c === '/飞信 会话 41 2'); assert.ok(next);
    const older = await app.runHandler(handler, event(next));
    assert.equal(older.messages.length, 1);
    assert.equal(older.actions[older.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    assert.deepEqual(requests[2].body.arguments, { scope: 'friend', page: '2', view: 'messages', conversationId: '41' });
    assert.match(inspectMessage(older.messages[0].nodes).text, /会话41记录1/);
    assert.equal(requests.length, 3);
  });
}

test('师门、宗门、道侣、队伍直接显示消息列表，不经过好友会话视图', async t => {
  const { app, requests } = await gameFixture(t, r => {
    const args = r.body.arguments as Record<string, unknown>;
    return businessEnvelope(r.bid, { ...base, scope: args.scope, total: 1, list: [message(1, String(args.scope))] });
  });
  for (const [label, scope] of [['师门', 'master'], ['宗门', 'guild'], ['道侣', 'companion'], ['队伍', 'team']]) {
    const result = await app.runHandler(handler, app.events.privateMessage({ text: `/飞信 ${label}`, platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(result.messages[0].nodes);
    assert.match(view.text, /会话41记录1/);
    assert.ok(!view.commands.some(c => c.startsWith('/飞信 会话 ')));
    assert.ok(view.commands.includes(`/发${label}飞信 `));
    assert.deepEqual(requests.at(-1)?.body.arguments, { scope, page: '1' });
  }
  assert.equal(requests.length, 4);
});

test('好友空会话与会话内空记录分别展示，错误会话响应不泄露内容', async t => {
  let invalid = false;
  const { app } = await gameFixture(t, r => {
    const args = r.body.arguments as Record<string, unknown>;
    return businessEnvelope(r.bid, args.view === 'conversations'
      ? { ...inbox(), conversations: [], total: 0, totalPage: 1 }
      : { ...thread(), total: invalid ? 1 : 0, totalPage: 1, list: invalid ? [{ ...message(1), conversationId: 99, content: '不应泄露的记录' }] : [] });
  });
  for (const [command, expected] of [['/飞信', /暂无会话/], ['/飞信 会话 41', /暂无消息记录/], ['/飞信 会话 41', /飞信暂不可用/]] as const) {
    const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(result.messages[0].nodes);
    assert.match(view.text, expected); assert.doesNotMatch(view.text, /不应泄露/);
    if (command.includes('会话')) invalid = true;
  }
});

test('会话解析校验安全编号、所选会话与响应视图', () => {
  assert.deepEqual(parseFlyMailHomeCommand('/飞信 会话 41 2'), { scope: 'friend', conversationId: 41, page: 2 });
  assert.equal(parseFlyMailHomeCommand('/飞信 会话 0'), null);
  assert.equal(parseFlyMailHomeCommand('/飞信 会话 9007199254740992'), null);
  assert.throws(() => parseRobotFriendInbox({ ...inbox(), view: 'messages' }), /不完整/);
  assert.throws(() => parseRobotFriendInbox(thread(), 42), /不完整/);
});

 test('群内查看飞信不查询历史、不显示会话或正文',async t=>{
 const {app,requests}=await gameFixture(t,()=>{throw new Error('must not query');});
 const result=await app.runHandler(handler,app.events.groupMessage({text:'/飞信 会话 41',platform:'qq-bot'}));
 assert.deepEqual(result.errors,[]);assert.equal(requests.length,0);assert.equal(result.messages.length,1);
 const view=inspectMessage(result.messages[0].nodes);assert.match(view.text,/私聊机器人/);assert.deepEqual(view.commands,[]);
 });

test('群内屏蔽设置不查询或展示飞信联系人',async t=>{
 const {app,requests}=await gameFixture(t,()=>{throw new Error('must not query');});
 const result=await app.runHandler(muteHandler,app.events.groupMessage({text:'/飞信禁言 141',platform:'qq-bot'}));
 assert.deepEqual(result.errors,[]);assert.equal(requests.length,0);assert.equal(result.messages.length,1);
 const view=inspectMessage(result.messages[0].nodes);assert.match(view.text,/私聊机器人/);assert.doesNotMatch(view.text,/141/);assert.deepEqual(view.commands,[]);
});
