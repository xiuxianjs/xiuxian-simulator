import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { createGameRouter } from '../../src/router';
import { startFeatureVisibility } from '../../src/utils/featureVisibility';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());

test('万宝楼商运显示公示货单和下一席工钱，群友可刷新同一趟车', async t => {
  const { app, requests } = await gameFixture(t, request => {
    assert.ok(request.path.endsWith('/shop-raid.board'));
    return businessEnvelope(request.bid, {
      items: [{
        id: 81,
        phase: 'recruiting',
        departureAt: '2026-11-23T13:02:00Z',
        arrivalAt: '2026-11-23T14:02:00Z',
        guardCount: 0,
        nextGuardWage: 15,
        nextGuardSeat: 1,
        nextNeedsMain: true,
        manifest: [{ category: 'item', name: '精力丹', templateId: 38, quantity: 3 }]
      }]
    });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  for (const command of ['/万宝楼商运', '/万宝楼商运 81']) {
    const result = await app.dispatch(app.events.groupMessage({ text: command, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const [message] = result.messages;
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const rendered = inspectMessage(message.nodes);
    assert.match(rendered.text, /护卫招募中/);
    assert.match(rendered.text, /精力丹 ×3/);
    assert.match(rendered.text, /下一席工钱 15 灵晶/);
    assert.ok(rendered.commands.includes('/万宝楼商运 81'));
    assert.ok(rendered.commands.includes('/加入商运护卫 81 1'));
  }
  assert.deepEqual(requests.map(request => request.body.arguments), [{ convoyId: 0 }, { convoyId: 81 }]);
});

test('万宝楼护卫确认先展示工钱和主守风险，再提交席位', async t => {
  const { app, requests } = await gameFixture(t, request => {
    const signed = request.path.endsWith('/shop-raid.guard');
    assert.ok(signed || request.path.endsWith('/shop-raid.board'));
    return businessEnvelope(request.bid, {
      items: [{
        id: 81,
        phase: 'recruiting',
        departureAt: '2026-11-23T13:02:00Z',
        arrivalAt: '2026-11-23T14:02:00Z',
        guardCount: signed ? 1 : 0,
        nextGuardWage: signed ? 10 : 15,
        nextGuardSeat: signed ? 2 : 1,
        nextNeedsMain: !signed,
        myGuardSeat: signed ? 1 : undefined,
        myGuardMain: signed,
        manifest: [{ category: 'item', name: '精力丹', templateId: 38, quantity: 3 }]
      }]
    });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const send = async (text: string) => {
    const result = await app.dispatch(app.events.groupMessage({ text, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const [message] = result.messages;
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    return inspectMessage(message.nodes);
  };
  const preview = await send('/加入商运护卫 81 1');
  assert.match(preview.text, /守成工钱 15 灵晶/);
  assert.match(preview.text, /可能损失普通财物/);
  assert.ok(preview.commands.includes('/确认商运护卫 81 1 主守'));
  assert.ok(!preview.commands.includes('/确认商运护卫 81 1 助守'));
  const signed = await send('/确认商运护卫 81 1 主守');
  assert.match(signed.text, /你在 1 号护卫席/);
  assert.ok(signed.commands.includes('/退出商运护卫 81'));
  assert.deepEqual(requests[1].body.arguments, { convoyId: 81, seat: 1, mainGuard: true, mode: 'join' });
});

test('商运守满时从原卡确认留用并展示结案回执', async t => {
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('/shop-raid.close')) {
      return businessEnvelope(request.bid, { convoyId: 81, action: 'retain', crystals: 0 });
    }
    assert.ok(request.path.endsWith('/shop-raid.board'));
    return businessEnvelope(request.bid, {
      items: [{
        id: 81,
        phase: 'ready',
        revision: 7,
        canClose: true,
        decisionUntil: '2026-11-24T13:46:00Z',
        returnBounty: 60,
        eligibleBounty: 60,
        holderId: 100,
        departureAt: '2026-11-23T13:02:00Z',
        arrivalAt: '2026-11-23T14:02:00Z',
        manifest: [{ category: 'item', name: '精力丹', templateId: 38, quantity: 3 }]
      }]
    });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const send = async (text: string) => {
    const result = await app.dispatch(app.events.groupMessage({ text, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const [message] = result.messages;
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    return inspectMessage(message.nodes);
  };
  const board = await send('/万宝楼商运 81');
  assert.match(board.text, /逾时自动留用/);
  assert.ok(board.commands.includes('/商运结案 81 留用'));
  assert.ok((await send('/商运结案 81 留用')).commands.includes('/确认商运结案 81 留用 7'));
  assert.match((await send('/确认商运结案 81 留用 7')).text, /整车货已留用/);
  assert.deepEqual(requests[2].body.arguments, { convoyId: 81, action: 'retain', revision: 7 });
  const bounty = await send('/商运结案 81 归还');
  assert.match(bounty.text, /本趟报酬 60 灵晶/);
  assert.ok(bounty.commands.includes('/确认商运结案 81 归还 7'));
});

test('全 NPC 商队可立即抢，个人回执可查整车易手结果', async t => {
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('/shop-raid.solo-status')) {
      return businessEnvelope(request.bid, { attemptId: 9, convoyId: 81, state: 'settled', outcome: { attackWon: true } });
    }
    if (request.path.endsWith('/shop-raid.solo')) {
      return businessEnvelope(request.bid, { attemptId: 9, state: 'queued' });
    }
    assert.ok(request.path.endsWith('/shop-raid.board'));
    return businessEnvelope(request.bid, {
      items: [{
        id: 81, phase: 'traveling', revision: 2, canSoloRaid: true,
        departureAt: '2026-11-23T13:02:00Z', arrivalAt: '2026-11-23T14:02:00Z',
        manifest: [{ category: 'currency', currency: 'SPIRIT_STONE', quantity: 1000 }]
      }]
    });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const send = async (text: string) => {
    const result = await app.dispatch(app.events.groupMessage({ text, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const [message] = result.messages;
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    return inspectMessage(message.nodes);
  };
  assert.ok((await send('/万宝楼商运 81')).commands.includes('/立即抢商队 81'));
  assert.ok((await send('/立即抢商队 81 2')).commands.includes('/查看劫货进度 9'));
  assert.match((await send('/查看劫货进度 9')).text, /夺下整车货/);
  assert.deepEqual(requests[1].body.arguments, { convoyId: 81, revision: 2 });
});

test('建队和入队使用独立指令，招募卡不发起组队抢', async t => {
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('/shop-raid.crew')) {
      return businessEnvelope(request.bid, {
        crew: { id: 9, leaderId: 123, members: [123] }, viewerId: 123, crews: []
      });
    }
    assert.ok(request.path.endsWith('/shop-raid.board'));
    return businessEnvelope(request.bid, {
      teamsEnabled: true,
      items: [{
        id: 81, phase: 'recruiting',
        departureAt: '2026-11-23T13:02:00Z', arrivalAt: '2026-11-23T14:02:00Z',
        nextGuardSeat: 1, nextGuardWage: 15,
        manifest: [{ category: 'currency', currency: 'SPIRIT_STONE', quantity: 1000 }]
      }]
    });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const send = async (text: string) => {
    const result = await app.dispatch(app.events.groupMessage({ text, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    return inspectMessage(result.messages[0].nodes);
  };
  const card = await send('/万宝楼商运 81');
  assert.ok(card.commands.includes('/加入商运护卫 81 1'));
  assert.ok(card.commands.includes('/打劫队 创建'));
  assert.ok(!card.commands.includes('/组队抢商队 81 行动'));
  const team = await send('/打劫队 创建');
  assert.match(team.text, /队长 UID 123 · 1\/3 人/);
  assert.ok(team.commands.includes('/打劫队 加入 9'));
  await send('/打劫队 加入 9');
  assert.deepEqual(requests.slice(1).map(request => request.body.arguments), [
    { crewId: 0, memberId: 0, mode: 'create' },
    { crewId: 9, memberId: 0, mode: 'join' }
  ]);
});

test('启程后队长从商队原卡发起组队抢并绑定当前阵容', async t => {
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('/shop-raid.solo')) {
      return businessEnvelope(request.bid, { attemptId: 10, state: 'queued' });
    }
    if (request.path.endsWith('/shop-raid.crew')) {
      assert.deepEqual(request.body.arguments, { convoyId: 81, mode: 'prepare' });
      return businessEnvelope(request.bid, {});
    }
    assert.ok(request.path.endsWith('/shop-raid.board'));
    return businessEnvelope(request.bid, {
      teamsEnabled: true, myTeamId: 9, myTeamLeader: true,
      teams: [{ id: 9, leaderId: 123, members: [123, 456], revision: 3 }],
      items: [{
        id: 81, phase: 'traveling', revision: 4, canSoloRaid: true,
        departureAt: '2026-11-23T13:02:00Z', arrivalAt: '2026-11-23T14:02:00Z',
        manifest: [{ category: 'currency', currency: 'SPIRIT_STONE', quantity: 1000 }]
      }]
    });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const send = async (text: string) => {
    const result = await app.dispatch(app.events.groupMessage({ text, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    return inspectMessage(result.messages[0].nodes);
  };
  const card = await send('/万宝楼商运 81');
  assert.match(card.text, /队长支付元力、胜后占用整车/);
  assert.ok(card.commands.includes('/立即抢商队 81'));
  assert.ok(card.commands.includes('/组队抢商队 81 行动'));
  const receipt = await send('/组队抢商队 81 行动');
  assert.ok(receipt.commands.includes('/查看劫货进度 10'));
  assert.deepEqual(requests[4].body.arguments, { convoyId: 81, revision: 4, teamId: 9, teamRevision: 3 });
});

test('有真人护卫时先显示财物对手，确认按钮绑定主守和临时队', async t => {
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('/shop-raid.guard-preview')) {
      return businessEnvelope(request.bid, { mainGuardId: 456, reverseEligible: true });
    }
    assert.ok(request.path.endsWith('/shop-raid.solo'));
    return businessEnvelope(request.bid, { attemptId: 10, state: 'queued' });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const send = async (text: string) => {
    const result = await app.dispatch(app.events.groupMessage({ text, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    return inspectMessage(result.messages[0].nodes);
  };
  const preview = await send('/预览商运斗法 81 4 9 3');
  assert.match(preview.text, /主守 UID 456/);
  assert.match(preview.text, /主守可能反夺普通财物/);
  assert.ok(preview.commands.includes('/确认商运斗法 81 4 456 9 3 可反夺'));
  const receipt = await send('/确认商运斗法 81 4 456 9 3 可反夺');
  assert.ok(receipt.commands.includes('/查看劫货进度 10'));
  assert.deepEqual(requests[1].body.arguments, { convoyId: 81, revision: 4, teamId: 9, teamRevision: 3, mainGuardId: 456, reverseConfirmed: true });
});

test('持货反抢沿用原商队卡，确认对象为当前持货者', async t => {
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('/shop-raid.guard-preview')) {
      return businessEnvelope(request.bid, { mainGuardId: 456, holderBattle: true });
    }
    if (request.path.endsWith('/shop-raid.solo')) {
      return businessEnvelope(request.bid, { attemptId: 10, state: 'queued' });
    }
    return businessEnvelope(request.bid, {
      items: [{
        id: 81, phase: 'contested', revision: 4, holderId: 456, holdUntil: '2026-11-23T13:46:00Z',
        departureAt: '2026-11-23T13:02:00Z', arrivalAt: '2026-11-23T14:02:00Z',
        manifest: [{ category: 'currency', currency: 'SPIRIT_STONE', quantity: 1000 }]
      }]
    });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const send = async (text: string) => {
    const result = await app.dispatch(app.events.groupMessage({ text, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    return inspectMessage(result.messages[0].nodes);
  };
  const card = await send('/万宝楼商运 81');
  assert.ok(card.commands.includes('/立即抢商队 81'));
  const preview = await send('/预览商运斗法 81 4');
  assert.match(preview.text, /确认反抢整车/);
  assert.match(preview.text, /持货者 UID 456/);
  assert.doesNotMatch(preview.text, /次日不能/);
  await send('/确认商运斗法 81 4 456');
  assert.deepEqual(requests[2].body.arguments, { convoyId: 81, revision: 4, mainGuardId: 456 });
});

test('商运归还分成的邀请卡按指定账号和原报价确认', async t => {
  const { app, requests } = await gameFixture(t, request => {
    assert.ok(request.path.endsWith('/shop-raid.team-share'));
    return businessEnvelope(request.bid, { memberId: 456, amount: 20 });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const offer = await app.dispatch(app.events.groupMessage({ text: '/商运归还分成 81 9 456 20', platform: 'qq-bot' }));
  assert.deepEqual(offer.errors, []);
  const card = inspectMessage(offer.messages[0].nodes);
  assert.match(card.text, /合资格归还时分 20 灵晶/);
  assert.ok(card.commands.includes('/确认商运分成 81 9 456 20'));
  const accepted = await app.dispatch(app.events.groupMessage({ text: '/确认商运分成 81 9 456 20', platform: 'qq-bot' }));
  assert.deepEqual(accepted.errors, []);
  assert.match(inspectMessage(accepted.messages[0].nodes).text, /归还分成已确认/);
  assert.deepEqual(requests[1].body.arguments, { convoyId: 81, teamId: 9, memberId: 456, amount: 20, accept: true });
  const automatic = await app.dispatch(app.events.groupMessage({ text: '/商运归还分成 81 9 456 20 自动归还', platform: 'qq-bot' }));
  assert.deepEqual(automatic.errors, []);
  const autoCard = inspectMessage(automatic.messages[0].nodes);
  assert.match(autoCard.text, /守满后自动归还并结算/);
  assert.ok(autoCard.commands.includes('/确认商运分成 81 9 456 20 自动归还'));
  assert.deepEqual(requests[2].body.arguments, { convoyId: 81, teamId: 9, memberId: 456, amount: 20, accept: false, autoReturn: true });
});

test('队员从同一商队卡选择只打或胜后继续守', async t => {
  const stamp = 'a'.repeat(32);
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('/shop-raid.participation')) {
      return businessEnvelope(request.bid, { mode: 'fight' });
    }
    return businessEnvelope(request.bid, {
      teamsEnabled: true, myTeamId: 9, participationStamp: stamp, pendingMembers: 1, myShare: 20,
      teams: [{ id: 9, leaderId: 123, members: [123, 456], revision: 3 }],
      items: [{
        id: 81, phase: 'traveling', revision: 4, canSoloRaid: true,
        departureAt: '2026-11-23T13:02:00Z', arrivalAt: '2026-11-23T14:02:00Z',
        manifest: [{ category: 'currency', currency: 'SPIRIT_STONE', quantity: 1000 }]
      }]
    });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const dispatch = (text: string) => app.dispatch(app.events.groupMessage({ text, platform: 'qq-bot' }));
  const board = await dispatch('/万宝楼商运 81');
  const card = inspectMessage(board.messages[0].nodes);
  assert.match(card.text, /符合资格可分 20 灵晶/);
  assert.ok(card.commands.includes(`/确认商运出战 81 9 ${stamp} 继续守`));
  const fightOnly = `/确认商运出战 81 9 ${stamp} 只打`;
  assert.ok(card.commands.includes(fightOnly));
  const receipt = await dispatch(fightOnly);
  assert.deepEqual(receipt.errors, []);
  assert.match(inspectMessage(receipt.messages[0].nodes).text, /胜后离队/);
  assert.deepEqual(requests[1].body.arguments, { convoyId: 81, teamId: 9, stamp, mode: 'fight' });
});

test('商运直接展示已结战果，队员的落选单抢能跳到原队斗法', async t => {
  const { app } = await gameFixture(t, request => {
    if (request.path.endsWith('/shop-raid.solo')) {
      return businessEnvelope(request.bid, { attemptId: 9, convoyId: 81, state: 'settled', outcome: { attackWon: true } });
    }
    assert.ok(request.path.endsWith('/shop-raid.solo-status'));
    return businessEnvelope(request.bid, { attemptId: 10, convoyId: 81, state: 'not_selected', outcome: { teamBattleId: 9 } });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const send = async (text: string) => {
    const result = await app.dispatch(app.events.groupMessage({ text, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    return inspectMessage(result.messages[0].nodes);
  };
  assert.match((await send('/立即抢商队 81 4')).text, /夺下整车货/);
  const other = await send('/查看劫货进度 10');
  assert.match(other.text, /已随原队伍进入本场斗法/);
  assert.ok(other.commands.includes('/查看劫货进度 9'));
});

test('旁观者从旧劫货回执点击，用本人身份读取当前持货人与队伍', async t => {
  let batchOpen = false;
  let fighting = true;
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('/shop-raid.solo')) {
      assert.equal(request.bid, 'first-raider');
      return businessEnvelope(request.bid, { attemptId: 9, convoyId: 81, state: 'settled', outcome: { attackWon: true } });
    }
    if (request.path.endsWith('/shop-raid.guard-preview')) {
      assert.equal(request.bid, 'observer');
      assert.deepEqual(request.body.arguments, { convoyId: 81, revision: 12 });
      return businessEnvelope(request.bid, { mainGuardId: 301, holderBattle: true, reverseEligible: true });
    }
    if (request.path.endsWith('/shop-raid.crew')) {
      assert.deepEqual(request.body.arguments, { convoyId: 81, mode: 'prepare' });
      return businessEnvelope(request.bid, {});
    }
    assert.ok(request.path.endsWith('/shop-raid.board'));
    assert.ok(request.bid === 'observer' || request.bid === 'first-raider');
    return businessEnvelope(request.bid, {
      teamsEnabled: true, myTeamId: 19, myTeamLeader: true, pendingMembers: 0,
      teams: [{ id: 19, leaderId: 302, revision: 5, members: [302, 303] }],
      items: [{
        id: 81, phase: fighting ? 'fighting' : 'contested', raidPhase: batchOpen ? 'contested' : undefined,
        revision: 12, holderId: 301, guardCount: 0, canClose: request.bid === 'first-raider',
        departureAt: '2026-11-23T13:02:00Z', arrivalAt: '2026-11-23T14:02:00Z',
        manifest: [{ category: 'currency', currency: 'SPIRIT_STONE', quantity: 1000 }]
      }]
    });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const send = async (userId: string, text: string) => {
    const result = await app.dispatch(app.events.groupMessage({ text, userId, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    return inspectMessage(result.messages[0].nodes);
  };
  const receipt = await send('first-raider', '/立即抢商队 81 4');
  const solo = '/立即抢商队 81';
  const team = '/组队抢商队 81 行动';
  assert.ok(receipt.commands.includes(solo));
  assert.ok(receipt.commands.includes(team));
  const waiting = await send('observer', solo);
  assert.match(waiting.text, /斗法中/);
  assert.ok(waiting.commands.includes(solo));
  assert.ok(waiting.commands.includes(team));
  assert.equal(requests.length, 2);

  batchOpen = true;
  const soloPreview = await send('observer', solo);
  assert.match(soloPreview.text, /持货者 UID 301/);
  assert.ok(soloPreview.commands.includes('/确认商运斗法 81 12 301 可反夺'));
  const teamPreview = await send('observer', team);
  assert.ok(teamPreview.commands.includes('/确认商运斗法 81 12 301 19 5 可反夺'));
  fighting = false;
  batchOpen = false;
  const holdersCard = await send('first-raider', '/万宝楼商运 81');
  assert.ok(holdersCard.commands.includes(solo));
  assert.ok(holdersCard.commands.includes(team));
  assert.match((await send('first-raider', solo)).text, /玩家占用中/);
  assert.match((await send('observer', solo)).text, /持货者 UID 301/);
  assert.equal(requests.filter(request => request.path.endsWith('/shop-raid.solo')).length, 1);
});

test('持货后协守需本人确认，反抢确认携带守货阵容', async t => {
  const stamp = 'a1b2c3d4a1b2c3d4';
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('/shop-raid.crew')) return businessEnvelope(request.bid, {});
    if (request.path.endsWith('/shop-raid.guard-preview')) {
      return businessEnvelope(request.bid, { mainGuardId: 301, holderBattle: true, reverseEligible: true, defenders: [301, 302], defenderStamp: stamp, baseQiCost: 15 });
    }
    assert.ok(request.path.endsWith('/shop-raid.solo'));
    return businessEnvelope(request.bid, { attemptId: 20, convoyId: 81, state: 'settled', outcome: { attackWon: true } });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const send = async (text: string) => {
    const result = await app.dispatch(app.events.groupMessage({ text, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    return inspectMessage(result.messages[0].nodes);
  };
  assert.match((await send('/打劫队 协守 81 12')).text, /已加入本车协守/);
  assert.deepEqual(requests[0].body.arguments, { mode: 'support', convoyId: 81, revision: 12 });
  const preview = await send('/预览商运斗法 81 13');
  assert.match(preview.text, /守货阵容 UID 301、302/);
  assert.match(preview.text, /基础消耗 15 点/);
  assert.match(preview.text, /锁阵时离队，未出战则留队/);
  const confirmation = `/确认商运斗法 81 13 301 阵容${stamp} 可反夺`;
  assert.ok(preview.commands.includes(confirmation));
  const won = await send(confirmation);
  assert.ok(won.commands.includes('/打劫队 创建'));
  assert.deepEqual(requests[2].body.arguments, { convoyId: 81, revision: 13, mainGuardId: 301, reverseConfirmed: true, defenderStamp: stamp });
});

test('我的状态逐张展示符箓的到期和合计加成', async t => {
  const { app } = await gameFixture(t, request => {
    assert.ok(request.path.endsWith('/status-effects.list'));
    return businessEnvelope(request.bid, { items: [
      { id: 1, code: 'yang_yuan', name: '养元符', source: 'shop_raid', rateBps: 2500, expiresAt: '2026-11-23T15:00:00Z' },
      { id: 2, code: 'yang_yuan', name: '养元符', source: 'shop_raid', rateBps: 2500, startedAt: '2026-11-23T15:00:00Z', expiresAt: '2026-11-23T21:00:00Z', pending: true },
      { id: 3, code: 'da_zhou_tian', name: '大周天符', source: 'shop_raid', rateBps: 5000, expiresAt: '2026-11-23T18:00:00Z' },
      { id: 4, code: 'ju_bao', name: '聚宝符', source: 'shop_raid', rateBps: 5000, remainingUses: 2, remainingQuota: 1400, expiresAt: '2026-11-23T18:00:00Z' },
      { id: 5, code: 'yu_feng', name: '渔丰符', source: 'shop_raid', rateBps: 5000, remainingUses: 2, remainingQuota: 100, expiresAt: '2026-11-23T18:00:00Z' },
      { id: 6, code: 'jie_xing', name: '节行符', source: 'shop_raid', rateBps: 3000, remainingUses: 2, remainingQuota: 12, expiresAt: '2026-11-23T18:00:00Z' },
      { id: 7, code: 'tong_xing', name: '通行符', source: 'shop_raid', rateBps: 5000, remainingUses: 8, remainingQuota: 90, expiresAt: '2026-11-23T18:00:00Z' },
      { id: 8, code: 'lian_gong_jie_fei', name: '惜灵符', source: 'shop_raid', rateBps: 2500, remainingUses: 1, remainingQuota: 2000, expiresAt: '2026-11-24T18:00:00Z' }
    ] });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const result = await app.dispatch(app.events.groupMessage({ text: '/我的状态', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const card = inspectMessage(result.messages[0].nodes);
  assert.match(card.text, /闭关基础修为 \+75%/);
  assert.match(card.text, /养元符/);
  assert.match(card.text, /大周天符/);
  assert.match(card.text, /普通秘境基础灵石 \+50% · 剩 2 次、1400 灵石/);
  assert.match(card.text, /本人钓获回收 \+50% · 剩 2 尾、100 灵鳞钱/);
  assert.match(card.text, /主线与普通秘境精力减 30% · 剩 2 次、12 点精力/);
  assert.match(card.text, /主线与普通秘境精力减 50% · 剩 8 次、90 点精力/);
  assert.match(card.text, /惜灵符/);
  assert.match(card.text, /升级功法时可选用 · 灵石减 25% · 单张最多抵 2000 灵石/);
  assert.match(card.text, /万宝楼商运/);
  assert.ok(card.commands.includes('/我的状态'));
  assert.match(card.text, /养元符 ×2/);
  assert.match(card.text, /1 张待续/);
  assert.ok(card.commands.includes('/我的状态 yang_yuan'));
  const detail = await app.dispatch(app.events.groupMessage({ text: '/我的状态 yang_yuan', platform: 'qq-bot' }));
  assert.deepEqual(detail.errors, []);
  assert.match(inspectMessage(detail.messages[0].nodes).text, /预计接续/);
});

test('惜灵符报价显示实际用符，过期重新报价', async t => {
  const token = 'a'.repeat(32);
  const replacement = 'b'.repeat(32);
  const quote = {
    bookId: 44, bookName: '破军', requested: 5, available: 1, baseCost: 1000, paidCost: 750, requiredExp: 100,
    uses: [{ id: 1, amount: 250 }], token
  };
  const { app } = await gameFixture(t, request => {
    assert.ok(request.path.endsWith('/skill-books.upgrade-with-discount'));
    const args = request.body.arguments as { token?: string };
    return businessEnvelope(request.bid, args.token
      ? { outcome: 'requote', discountQuote: { ...quote, available: 0, paidCost: 1000, uses: [], token: replacement } }
      : quote);
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const preview = await app.dispatch(app.events.groupMessage({ text: '/升级功法 44 节费 5', platform: 'qq-bot' }));
  assert.deepEqual(preview.errors, []);
  const card = inspectMessage(preview.messages[0].nodes);
  assert.match(card.text, /实付 750 灵石/);
  assert.match(card.text, /将用 1 张惜灵符/);
  assert.match(card.text, /每次升级最多用一张/);
  const confirm = `/升级功法 44 节费 5 ${token}`;

  assert.ok(card.commands.includes(confirm));
  const stale = await app.dispatch(app.events.groupMessage({ text: confirm, platform: 'qq-bot' }));
  assert.deepEqual(stale.errors, []);
  const renewed = inspectMessage(stale.messages[0].nodes);
  assert.match(renewed.text, /本次未升级、未扣费/);
  assert.match(renewed.text, /实付 1000 灵石/);
  assert.ok(renewed.commands.includes(`/升级功法 44 节费 5 ${replacement}`));
});

test('双书商队公开单件挂赏并说明整车归还', async t => {
  const { app } = await gameFixture(t, request => {
    assert.ok(request.path.endsWith('/shop-raid.board'));
    return businessEnvelope(request.bid, {
      items: [{
        id: 81,
        phase: 'traveling',
        revision: 2,
        departureAt: '2026-11-23T13:02:00Z',
        arrivalAt: '2026-11-23T14:02:00Z',
        guardCount: 0,
        canSoloRaid: true,
        returnBounty: 60,
        manifest: [
          { category: 'skill_book', name: '寒冰箭', templateId: 4, quantity: 1, returnBounty: true },
          { category: 'skill_book', name: '烈焰斩', templateId: 16, quantity: 1 }
        ]
      }]
    });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const result = await app.dispatch(app.events.groupMessage({ text: '/万宝楼商运 81', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  const card = inspectMessage(result.messages[0].nodes);
  assert.match(card.text, /寒冰箭 ×1、烈焰斩 ×1/);
  assert.match(card.text, /寒冰箭 ×1 附归还赏/);
  assert.match(card.text, /整车归还奖酬 60 灵晶/);
  assert.ok(card.commands.includes('/立即抢商队 81'));
});

test('无护送钱的实物车保留组队和启程后的抢货入口', async t => {
  let traveling = false;
  const { app } = await gameFixture(t, request => {
    assert.ok(request.path.endsWith('/shop-raid.board'));
    return businessEnvelope(request.bid, { teamsEnabled: true, items: [{
      id: 81, phase: traveling ? 'traveling' : 'recruiting', revision: 2, noPaidGuard: true,
      departureAt: '2026-11-23T13:02:00Z', arrivalAt: '2026-11-23T14:02:00Z',
      guardCount: 0, canSoloRaid: traveling,
      manifest: [{ category: 'item', name: '精力丹', templateId: 38, quantity: 3 }]
    }] });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const send = async () => {
    const result = await app.dispatch(app.events.groupMessage({ text: '/万宝楼商运 81', platform: 'qq-bot' }));

    assert.deepEqual(result.errors, []);

    return inspectMessage(result.messages[0].nodes);
  };
  const before = await send();

  assert.match(before.text, /NPC 护送，启程后可争夺整车/);
  assert.ok(before.commands.includes('/打劫队 创建'));
  assert.ok(!before.commands.some(command => command.startsWith('/加入商运护卫')));
  assert.ok(!before.commands.includes('/立即抢商队 81'));
  traveling = true;
  const after = await send();

  assert.match(after.text, /NPC 护送，现可争夺整车/);
  assert.ok(after.commands.includes('/立即抢商队 81'));
});

test('个人活动的送货商队打开列表，即使当前没有发车', async t => {
  let items: unknown[] = [];
  const ownCrew = { id: 9, leaderId: 1, members: [1, 2] };
  const otherCrew = { id: 10, leaderId: 3, members: [3] };
  let belongsToCrew = false;
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('/activity.hub')) {
      return businessEnvelope(request.bid, {
        limitedEvent: { activeCount: 0 },
        guildCompetition: { phase: 'INACTIVE' },
        guildSecretRealmWar: { phase: 'INACTIVE', activeStartAt: '', activeEndAt: '', maxAttackPerWeek: 0, remainingAttackCount: 0 },
        access: { hasGuild: true, canAccessOverseasIsland: false },
        newcomerVisible: false,
        giftCodesVisible: false
      });
    }
    if (request.path.endsWith('/shop-raid.board')) return businessEnvelope(request.bid, { items });
    if (request.path.endsWith('/shop-raid.solo-status')) {
      const id = (request.body.arguments as { attemptId: number }).attemptId;
      return businessEnvelope(request.bid, {
        attemptId: id, convoyId: 81, state: id === 1 ? 'settled' : id === 2 ? 'ineligible' : 'not_selected',
        outcome: id === 1 ? { attackWon: true } : id === 2 ? { rejectionReason: 'defenders_changed' } : undefined,
        currentConvoy: {
          id: 81, phase: 'contested', departureAt: '2026-11-23T13:02:00Z', arrivalAt: '2026-11-23T14:02:00Z',
          holderId: 301, holdUntil: '2026-11-23T13:32:00Z',
          manifest: [{ category: 'currency', currency: 'SPIRIT_STONE', quantity: 1000 }]
        }
      });
    }
    if (request.path.endsWith('/shop-raid.crew')) {
      assert.deepEqual(request.body.arguments, { mode: 'list', crewId: 0, memberId: 0 });
      return businessEnvelope(request.bid, {
        crews: belongsToCrew ? [ownCrew, otherCrew] : [otherCrew], viewerId: 1,
        ...(belongsToCrew ? { crew: ownCrew } : {})
      });
    }
    assert.ok(request.path.includes('/content/tianshu'));
    return {
      gateVersion: 1, intro: '说明', realmUnlocks: [], notes: [],
      commandFeatures: { 我的活动: 'activities', 个人活动: 'activities', 宗门活动: 'activities', 宗门日常: 'activities' },
      featureCatalog: [{
        stageLevel: 0, stageName: '功能目录',
        features: [{ id: 'activities', name: '活动', description: '活动入口', realm: '无境界限制', realmReached: true, visible: true, conditions: [] }]
      }]
    };
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  await app.invoke(app.events.groupMessage(), startFeatureVisibility);
  const send = async (text: string) => {
    const result = await app.dispatch(app.events.groupMessage({ text, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const [message] = result.messages;
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    return inspectMessage(message.nodes);
  };
  const personal = await send('/我的活动');
  assert.match(personal.text, /送货商队/);
  const entry = personal.commands.find(command => command === '/万宝楼商运');
  assert.ok(entry);
  assert.ok(!(await send('/宗门活动')).commands.includes(entry));
  const emptyBoard = await send(entry);
  assert.match(emptyBoard.text, /当前没有正在招募或运送的商队/);
  const publicEntry = emptyBoard.commands.find(command => command === '/打劫队 列表');
  const ownEntry = emptyBoard.commands.find(command => command === '/打劫队 我的');
  assert.ok(publicEntry);
  assert.ok(ownEntry);
  assert.ok(!emptyBoard.commands.includes('/更多 交易'));
  assert.doesNotMatch(emptyBoard.text, /查看商队列表|返回坊市交易/);
  const availableTeams = await send(publicEntry);
  assert.match(availableTeams.text, /打劫队列表/);
  assert.ok(availableTeams.commands.includes('/打劫队 加入 10'));
  const noTeam = await send(ownEntry);
  assert.match(noTeam.text, /你尚未加入打劫队/);
  assert.ok(noTeam.commands.includes('/打劫队 创建'));
  assert.doesNotMatch(noTeam.text, /队伍 10/);
  belongsToCrew = true;
  const publicTeams = await send(publicEntry);
  assert.match(publicTeams.text, /队伍 9/);
  assert.match(publicTeams.text, /队伍 10/);
  assert.ok(!publicTeams.commands.includes('/打劫队 解散 9'));
  const myTeam = await send(ownEntry);
  assert.match(myTeam.text, /我的打劫队/);
  assert.match(myTeam.text, /队伍 9/);
  assert.doesNotMatch(myTeam.text, /队伍 10/);
  assert.ok(myTeam.commands.includes('/打劫队 解散 9'));
  assert.ok(!myTeam.commands.includes('/打劫队 加入 9'));
  assert.ok(myTeam.commands.includes(entry));
  items = [{
    id: 81, phase: 'recruiting', departureAt: '2026-11-23T13:02:00Z', arrivalAt: '2026-11-23T14:02:00Z', guardCount: 0,
    manifest: [{ category: 'item', name: '精力丹', templateId: 38, quantity: 3 }]
  }];
  const board = await send(entry);
  assert.match(board.text, /护卫招募中/);
  assert.match(board.text, /精力丹 ×3/);
  assert.ok(board.commands.includes(publicEntry));
  assert.ok(board.commands.includes(ownEntry));
  const won = await send('/查看劫货进度 1');
  assert.match(won.text, /万宝楼劫货回执 #81/);
  assert.match(won.text, /货单：灵石 ×1000/);
  assert.match(won.text, /当前占用：UID 301/);
  assert.match(won.text, /守至 .*21:32:00/);
  assert.ok(won.commands.includes('/立即抢商队 81'));
  assert.ok(won.commands.includes('/组队抢商队 81 行动'));
  assert.match((await send('/查看劫货进度 2')).text, /守货阵容已变，本次未出战，未扣元力/);
  assert.match((await send('/查看劫货进度 3')).text, /本轮由另一方先出战/);
  assert.deepEqual(requests.filter(request => request.path.endsWith('/shop-raid.board')).map(request => request.body.arguments), [
    { convoyId: 0 }, { convoyId: 0 }
  ]);
});

test('同车单抢后协守，第三人从旧回执反抢但锁阵前有人退队', async t => {
  let supports = false;
  let holder = false;
  const { app } = await gameFixture(t, request => {
    const route = request.path.split('/').at(-1);
    if (request.path.includes('/content/tianshu')) {
      return {
        gateVersion: 1, intro: '说明', realmUnlocks: [], notes: [],
        commandFeatures: { 我的活动: 'activities' },
        featureCatalog: [{
          stageLevel: 0, stageName: '功能目录',
          features: [{ id: 'activities', name: '活动', description: '活动入口', realm: '无境界限制', realmReached: true, visible: true, conditions: [] }]
        }]
      };
    }
    if (route === 'shop-raid.crew') {
      const operation = (request.body.arguments as { mode: string }).mode;
      if (operation === 'support') supports = true;
      if (operation === 'leave') supports = false;
      return businessEnvelope(request.bid, {
        crew: operation === 'leave' ? undefined : { id: 9, leaderId: 101, members: operation === 'create' ? [101] : [101, 102] },
        viewerId: request.bid === 'holder' ? 101 : 102, crews: []
      });
    }
    if (route === 'shop-raid.solo') {
      if (request.bid === 'holder') {
        holder = true;
        return businessEnvelope(request.bid, { attemptId: 1, convoyId: 81, state: 'settled', outcome: { attackWon: true } });
      }
      assert.equal(request.bid, 'spectator');
      assert.equal((request.body.arguments as { defenderStamp: string }).defenderStamp, 'a1b2c3d4a1b2c3d4');
      return businessEnvelope(request.bid, { attemptId: 2, convoyId: 81, state: 'queued' });
    }
    if (route === 'shop-raid.guard-preview') {
      return businessEnvelope(request.bid, { mainGuardId: 101, holderBattle: true, reverseEligible: true,
        defenders: supports ? [101, 102] : [101], defenderStamp: 'a1b2c3d4a1b2c3d4' });
    }
    if (route === 'shop-raid.solo-status') {
      assert.equal(request.bid, 'spectator');
      assert.equal(supports, false);
      return businessEnvelope(request.bid, { attemptId: 2, convoyId: 81, state: 'ineligible', outcome: { rejectionReason: 'defenders_changed' } });
    }
    assert.equal(route, 'shop-raid.board');
    return businessEnvelope(request.bid, { teamsEnabled: true, items: [{
      id: 81, phase: holder ? 'contested' : 'traveling', revision: supports ? 5 : 4, canSoloRaid: !holder,
      holderId: holder ? 101 : undefined, canClose: holder && request.bid === 'holder',
      canSupport: holder && request.bid === 'supporter',
      holdUntil: holder ? '2026-11-23T13:32:00Z' : undefined,
      departureAt: '2026-11-23T13:02:00Z', arrivalAt: '2026-11-23T14:02:00Z',
      manifest: [{ category: 'currency', currency: 'SPIRIT_STONE', quantity: 1000 }]
    }] });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  await app.invoke(app.events.groupMessage(), startFeatureVisibility);
  const send = async (userId: string, text: string) => {
    const result = await app.dispatch(app.events.groupMessage({ text, userId, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    return inspectMessage(result.messages[0].nodes);
  };
  const win = await send('holder', '/立即抢商队 81');
  assert.match(win.text, /夺下整车货/);
  assert.ok(win.commands.includes('/打劫队 创建'));
  const crew = await send('holder', '/打劫队 创建');
  assert.ok(crew.commands.includes('/打劫队 加入 9'));
  await send('supporter', '/打劫队 加入 9');
  const detail = await send('supporter', '/万宝楼商运 81');
  const support = detail.commands.find(text => text.startsWith('/打劫队 协守'));
  assert.ok(support);
  assert.match((await send('supporter', support)).text, /已加入本车协守/);

  const fromOldCard = win.commands.find(text => text === '/立即抢商队 81');
  assert.ok(fromOldCard);
  const counter = await send('spectator', fromOldCard);
  assert.match(counter.text, /守货阵容 UID 101、102/);
  const confirmation = counter.commands.find(text => text.startsWith('/确认商运斗法'));
  assert.ok(confirmation);
  const queued = await send('spectator', confirmation);
  assert.match(queued.text, /本轮斗法正在处理/);
  await send('supporter', '/打劫队 退出 9');
  assert.match((await send('spectator', '/查看劫货进度 2')).text, /守货阵容已变，本次未出战，未扣元力/);
  const final = await send('holder', '/万宝楼商运 81');
  assert.match(final.text, /占用人：UID 101/);
  assert.match(final.text, /守至.*21:32/);
});
