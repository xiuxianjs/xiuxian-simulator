import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestApp } from 'alemonjs/testing';
import { useMessage } from 'alemonjs';
import { rememberGameplay, guidanceSession, endGuidance } from '../../src/agent-play/guidance-session.ts';
import { readPreparationTargets, permitsPreparationFollowup, readConfirmationTargets, rememberConfirmation, confirmationGate, confirmationOptions, acknowledgeConfirmationOptions, confirmationPreviewText, recordConfirmationOutcome } from '../../src/agent-play/game-confirmation.ts';
import { createChatReplyFormat } from '../../../alemonjs-agent-link/lib/dsh/reply-format.js';
import { assertMessageDelivered } from '../../../alemonjs-agent-link/lib/dsh/output.js';
import handler from '../helpers/agent-play-message.ts';
const ref = suffix => `r1_1_f_1_${suffix.repeat(24)}`;
const result = reference => ({ ok: true, data: { success: true, branch: 'business', result: { token: reference } } });

for (const scenario of ['old-choice', 'same-turn', 'wrong-user', 'not-delivered', 'cancel', 'slash']) {
  test(`confirmation reference binding through actual Format: ${scenario}`, async t => {
    const app = createTestApp();
    t.after(() => app.dispose());
    if (scenario === 'not-delivered') app.actions.on('message.send', () => [{ code: 4000, data: null }]);
    const event = app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: `confirm-${scenario}`, messageId: 'preview-a', text: '看看这张图纸' });
    let label;
    await app.runHandler(async () => {
      rememberGameplay('preview_forge', result(ref('a')));
      rememberConfirmation('preview_forge', result(ref('a')));
      label = guidanceSession().offers[0].label;
      assert.ok(confirmationGate('confirm_forge', { reference: ref('a') }));
      const text = '原预览\n' + confirmationOptions();
      const [message] = useMessage();
      const sent = await message.send({ format: createChatReplyFormat(text, 'qq-bot') });
      if (scenario === 'not-delivered') assert.throws(() => assertMessageDelivered(sent));
      else { assertMessageDelivered(sent); acknowledgeConfirmationOptions(text); }
      if (scenario === 'same-turn') {
        event.MessageText = label;
        assert.ok(confirmationGate('confirm_forge', { reference: ref('a') }));
      }
    }, event, 'alemonjs-agent-link');
    if (scenario === 'same-turn') return;
    if (scenario === 'old-choice') {
      await app.runHandler(async () => {
        rememberConfirmation('preview_forge', result(ref('b')));
        assert.equal(guidanceSession().offers.length, 2);
      }, { ...event, MessageId: 'preview-b', MessageText: '换个方案看看' }, 'alemonjs-agent-link');
    }
    const choice = { ...event, MessageId: 'choice', MessageText: scenario === 'cancel' ? '取消' : scenario === 'slash' ? '/我的锻造' : label,
      UserId: scenario === 'wrong-user' ? 'outsider' : event.UserId };
    const response = await app.runHandler(async () => {
      if (scenario === 'cancel' || scenario === 'slash') {
        await handler();
        assert.ok(!guidanceSession()?.offers?.length);
        assert.ok(confirmationGate('confirm_forge', { reference: ref('a') }));
        return;
      }
      if (scenario === 'old-choice') {
        assert.ok(confirmationGate('confirm_forge', { reference: ref('b') }), 'old button cannot select latest preview');
        assert.equal(confirmationGate('confirm_forge', { reference: ref('a') }), undefined);
        assert.equal(confirmationGate('confirm_forge', { reference: ref('a') }), undefined, 'same reference remains available for idempotent retry');
      } else assert.ok(confirmationGate('confirm_forge', { reference: ref('a') }));
      endGuidance(choice);
    }, choice, 'alemonjs-agent-link');
    assert.deepEqual(response.errors, []);
    if (scenario === 'slash') assert.equal(response.nextCalls.length, 1);
  });
}

test('tool receipts retain complete JSON beyond the chat summary limit', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'receipt-user' });
  await app.runHandler(async () => {
    const original = { description: '材料'.repeat(1800), reference: ref('a') };
    rememberGameplay('preview_forge', original);
    assert.deepEqual(JSON.parse(guidanceSession().receipts[0]).receipt, original);
    rememberGameplay('get_inventory', { description: '大'.repeat(13000) });
    assert.equal(JSON.parse(guidanceSession().receipts.at(-1)).receipt.omitted, true);
    endGuidance(event);
  }, event, 'alemonjs-agent-link');
});

for (const [preview, confirm, kind, field] of [
  ['preview_shop_purchase', 'confirm_shop_purchase', 's', 'reference'],
  ['prepare_market_purchase', 'confirm_market_purchase', 'm', 'reference'],
  ['prepare_skill_batch_decomposition', 'confirm_skill_batch_decomposition', 'e', 'reference'],
  ['prepare_equipment_batch_decomposition', 'confirm_equipment_batch_decomposition', 'd', 'reference'],
  ['prepare_soul_artifact_replacement', 'confirm_soul_artifact_replacement', 'v', 'reference'],
  ['prepare_soul_artifact_separation', 'confirm_soul_artifact_separation', 'u', 'reference'],
  ['preview_spirit_root_feed', 'confirm_spirit_root_feed', 'r', 'reference'],
  ['prepare_skill_reset', 'confirm_skill_reset', 'w', 'reference'],
  ['prepare_companion_oath_upgrade', 'confirm_companion_oath_upgrade', 'o', 'reference'],
  ['prepare_guild_leadership_transfer', 'confirm_guild_leadership_transfer', 'z', 'reference'],
  ['prepare_cave_acceleration', 'confirm_cave_acceleration', 'c', 'reference'],
  ['preview_alchemy', 'confirm_alchemy', 'a', 'confirmations'],
  ['preview_forge', 'confirm_forge', 'f', 'token'],
  ['preview_forge_order', 'create_forge_order', 'f', 'token'],
  ['preview_tribulation', 'confirm_tribulation', 't', 'confirmationReference'],
  ['preview_heart_demon', 'confirm_heart_demon', 'h', 'confirmationReference']
]) test(`typed reference for ${confirm} rejects cross-kind and keeps original choice`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: `kind-${kind}`, messageId: 'preview' });
  const reference = `r1_1_${kind}_1_${'d'.repeat(24)}`;
  let label;
  const envelope = reference => ({ ok: true, data: { success: true, branch: 'business', result: { [field]: field === 'confirmations' ? [{ reference }] : reference } } });
  const first = await app.runHandler(async () => {
    rememberGameplay(preview, envelope(reference));
    rememberConfirmation(preview, envelope(`r1_1_${kind === 'a' ? 't' : 'a'}_1_${'d'.repeat(24)}`));
    assert.equal(guidanceSession().offers.length, 0);
    rememberConfirmation(preview, envelope(reference));
    label = guidanceSession().offers[0].label;
    const text = '原方案\n' + confirmationOptions();
    const [message] = useMessage();
    assertMessageDelivered(await message.send({ format: createChatReplyFormat(text, 'qq-bot') }));
    acknowledgeConfirmationOptions(text);
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(first.errors, []);
  assert.ok(JSON.stringify(first.messages[0].nodes).includes(label));
  assert.ok(!JSON.stringify(first.messages[0].nodes).includes(reference), 'server reference is not button data');
  const second = await app.runHandler(async () => {
    if (kind === 'f') assert.ok(confirmationGate(confirm === 'confirm_forge' ? 'create_forge_order' : 'confirm_forge', { reference }));
    assert.equal(confirmationGate(confirm, { reference }), undefined);
    assert.ok(confirmationGate(confirm, { reference: reference.replace(/d$/u, 'e') }));
    endGuidance({ ...event });
  }, { ...event, MessageId: 'selection', MessageText: label }, 'alemonjs-agent-link');
  assert.deepEqual(second.errors, []);
});


test('trade preview renders original totals and expiry without recomputing or losing warning', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'trade-facts' });
  const quote = { ok: true, data: { success: true, branch: 'business', result: { expiresAt: '2026-11-02T15:00:00+08:00', preview: {
    itemName: '测试材料', quantity: 3, totalPrice: 47, currencyName: '灵石', overpriceWarning: '报价高于参考范围'
  } } } };
  quote.data.result.reference = `r1_1_m_1_${'a'.repeat(24)}`;
  quote.data.conversationPreview = { reference: quote.data.result.reference, text: '原选购预览\n商品：测试材料\n数量：3\n原总价：47 灵石\n报价高于参考范围\n有效期至：2026-11-02T15:00:00+08:00' };
  const response = await app.runHandler(async () => {
    const text = confirmationPreviewText('prepare_market_purchase', quote);
    const [message] = useMessage();
    assertMessageDelivered(await message.send({ format: createChatReplyFormat(text, 'qq-bot') }));
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(response.errors, []);
  assert.ok(response.messages[0].text.includes('47 灵石'));
  assert.ok(response.messages[0].text.includes('数量：3'));
  assert.ok(response.messages[0].text.includes('报价高于参考范围'));
  assert.ok(response.messages[0].text.includes(quote.data.result.expiresAt));
  assert.equal(confirmationPreviewText('prepare_market_purchase', { ok: false }), '');
});


for (const [preview, keep, cancel, kind] of [
  ['prepare_skill_reroll', 'confirm_skill_reroll', 'cancel_skill_reroll', 'x'],
  ['prepare_soul_artifact_wash', 'confirm_soul_artifact_wash', 'cancel_soul_artifact_wash', 'y'],
  ['get_peiyuan_confirmation', 'confirm_peiyuan_pill', 'cancel_peiyuan_pill', 'p']
]) test(`paid random result has real keep/discard decisions: ${kind}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: `decision-${kind}`, messageId: 'random-preview' });
  const reference = `r1_1_${kind}_1_${'e'.repeat(24)}`;
  let keepLabel, cancelLabel;
  await app.runHandler(async () => {
    const value = { ok: true, data: { success: true, branch: 'business', result: { reference } } };
    rememberGameplay(preview, value);
    rememberConfirmation(preview, value);
    const offers = guidanceSession().offers;
    assert.equal(offers.length, 2);
    keepLabel = offers.find(item => item.action === keep).label;
    cancelLabel = offers.find(item => item.action === cancel).label;
    const text = '原随机结果，已消耗物品。\n' + confirmationOptions();
    const [message] = useMessage();
    assertMessageDelivered(await message.send({ format: createChatReplyFormat(text, 'qq-bot') }));
    acknowledgeConfirmationOptions(text);
  }, event, 'alemonjs-agent-link');
  const cancellation = await app.runHandler(handler, { ...event, MessageId: 'ask-cancel', MessageText: '取消' }, 'alemonjs-agent-link');
  assert.deepEqual(cancellation.errors, []);
  assert.ok(cancellation.messages[0].text.includes('放弃不会返还'));
  assert.ok(cancellation.messages[0].text.includes('尚未提交'));
  assert.ok(JSON.stringify(cancellation.messages[0].nodes).includes(cancelLabel));
  const choice = { ...event, MessageId: 'discard', MessageText: cancelLabel };
  await app.runHandler(async () => {
    assert.equal(guidanceSession().offers.length, 2);
    assert.equal(confirmationGate(cancel, { reference }), undefined);
    recordConfirmationOutcome(cancel, reference, { ok: false, error: { outcome: 'unknown' } });
  }, choice, 'alemonjs-agent-link');
  await app.runHandler(async () => {
    assert.ok(confirmationGate(keep, { reference }), 'uncertain discard cannot become keep');
    recordConfirmationOutcome(cancel, reference, { ok: false, error: { outcome: 'not_started' } });
    assert.equal(confirmationGate(keep, { reference }), undefined, 'only explicit no-execution rejection releases decision');
    endGuidance(event);
  }, { ...event, MessageId: 'keep', MessageText: keepLabel }, 'alemonjs-agent-link');
});


for (const [preview, confirm, kind, original, changed] of [
  ['prepare_skill_learn', 'confirm_skill_learn', 'l', { bookId: 17 }, { bookId: 18 }],
  ['prepare_skill_switch', 'confirm_skill_switch', 'k', { bookId: 17, skillType: '功法' }, { bookId: 17, skillType: '神通' }],
  ['preview_cave_formation_activation', 'activate_cave_formation', 'g', { keyword: '原阵盘' }, { keyword: '另一阵盘' }]
]) test(`confirmation binds additional selector fields: ${confirm}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: `bound-${kind}`, messageId: 'preview' });
  const reference = `r1_1_${kind}_1_${'f'.repeat(24)}`;
  let label;
  await app.runHandler(async () => {
    const result = { ok: true, data: { success: true, branch: 'business', result: { reference } } };
    rememberGameplay(preview, result);
    rememberConfirmation(preview, result);
    assert.ok(!guidanceSession().offers?.length, 'missing selectors cannot create a usable confirmation');
    rememberConfirmation(preview, result, original);
    label = guidanceSession().offers[0].label;
    const text = '原方案\n' + confirmationOptions();
    const [message] = useMessage();
    assertMessageDelivered(await message.send({ format: createChatReplyFormat(text, 'qq-bot') }));
    acknowledgeConfirmationOptions(text);
  }, event, 'alemonjs-agent-link');
  await app.runHandler(async () => {
    assert.ok(confirmationGate(confirm, { reference, ...changed }));
    if (kind === 'l') assert.ok(confirmationGate(confirm, { reference, ...original, taskInput: '/新任务' }));
    assert.equal(confirmationGate(confirm, { reference, ...original }), undefined);
    endGuidance(event);
  }, { ...event, MessageId: 'confirm', MessageText: label }, 'alemonjs-agent-link');
});


for (const action of ['preview_soul_path_choose', 'preview_soul_path_switch', 'preview_soul_path_advance', 'preview_soul_path_reroll']) {
  test(`soul path uses original token field and disallows blind resubmission: ${action}`, async t => {
    const app = createTestApp();
    t.after(() => app.dispose());
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: action, messageId: 'preview' });
    const token = (action === 'preview_soul_path_choose' ? 'choose:' : '') + '12345678-1234-1234-1234-123456789abc';
    let label;
    await app.runHandler(async () => {
      const result = { ok: true, data: { success: true, branch: 'business', result: { confirmationToken: token } } };
      rememberGameplay(action, result);
      rememberConfirmation(action, result);
      label = guidanceSession().offers[0].label;
      const text = '原道途预览\n' + confirmationOptions();
      const [message] = useMessage();
      assertMessageDelivered(await message.send({ format: createChatReplyFormat(text, 'qq-bot') }));
      acknowledgeConfirmationOptions(text);
    }, event, 'alemonjs-agent-link');
    await app.runHandler(async () => {
      assert.ok(confirmationGate('confirm_soul_path', { reference: token }));
      assert.ok(confirmationGate('confirm_soul_path', { token: token + '0' }));
      assert.equal(confirmationGate('confirm_soul_path', { token }), undefined);
      assert.ok(confirmationGate('confirm_soul_path', { token }));
      endGuidance(event);
    }, { ...event, MessageId: 'confirm', MessageText: label }, 'alemonjs-agent-link');
  });
}

for (const preview of ['preview_treasure_exploration', 'preview_treasure_synthesis', 'preview_treasure_upgrade', 'preview_treasure_promotion',
  'preview_mythic_treasure_selection', 'preview_treasure_batch_upgrade', 'preview_treasure_batch_promotion', 'preview_treasure_decomposition',
  'preview_maxed_treasure_decomposition', 'preview_spirit_vein_claim', 'preview_treasure_free_daily_pack']) {
  test(`treasure original summary and confirmationRef: ${preview}`, async t => {
    const app = createTestApp();
    t.after(() => app.dispose());
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: preview, messageId: 'preview', text: '看看宝物方案' });
    const reference = `r1_1_b_1_${'b'.repeat(24)}`;
    const payload = { ok: true, data: { success: true, branch: 'business', result: {
      confirmationRef: reference, summary: ['原目标：夹具宝物', '原消耗：7份夹具材料'], expiresAt: '2026-11-02T16:00:00+08:00', operationId: 'original-operation'
    } } };
    payload.data.conversationPreview = { reference, text: '原宝物预览\n原目标：夹具宝物\n原消耗：7份夹具材料\n有效期至：2026-11-02T16:00:00+08:00' };
    const confirm = preview === 'preview_treasure_free_daily_pack' ? 'confirm_treasure_free_daily_pack' : 'confirm_treasure_action';
    let label;
    const sent = await app.runHandler(async () => {
      rememberGameplay(preview, payload);
      rememberConfirmation(preview, payload);
      label = guidanceSession().offers[0].label;
      assert.ok(confirmationGate(confirm, { confirmationRef: reference }));
      const facts = confirmationPreviewText(preview, payload);
      assert.ok(facts.includes('原消耗：7份夹具材料'));
      assert.ok(facts.includes(payload.data.result.expiresAt));
      const text = facts + '\n' + confirmationOptions();
      const [message] = useMessage();
      const receipts = await message.send({ format: createChatReplyFormat(text, 'qq-bot') });
      assertMessageDelivered(receipts);
      acknowledgeConfirmationOptions(text);
    }, event, 'alemonjs-agent-link');
    assert.deepEqual(sent.errors, []);
    const nodes = JSON.stringify(sent.messages[0].nodes);
    assert.ok(nodes.includes(label));
    assert.ok(!nodes.includes(reference), 'server reference is not a button payload');
    const selected = await app.runHandler(async () => {
      assert.ok(confirmationGate(confirm, { reference }), 'wrong field cannot confirm');
      assert.ok(confirmationGate(confirm, { confirmationRef: reference.replace('_b_', '_f_') }));
      assert.ok(confirmationGate(confirm === 'confirm_treasure_action' ? 'confirm_treasure_free_daily_pack' : 'confirm_treasure_action', { confirmationRef: reference }));
      assert.equal(confirmationGate(confirm, { confirmationRef: reference }), undefined);
      assert.equal(confirmationGate(confirm, { confirmationRef: reference }), undefined, 'original receipt supports idempotent retry');
      endGuidance(event);
    }, { ...event, MessageId: 'choice', MessageText: label }, 'alemonjs-agent-link');
    assert.deepEqual(selected.errors, []);
  });
}


test('peiyuan original positive and negative changes remain visible in actual Format', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'peiyuan-facts', messageId: 'original' });
  const result = await app.runHandler(async () => {
    const value = { ok: true, data: { success: true, branch: 'business', result: {
      reference: `r1_1_p_1_${'c'.repeat(24)}`, expiresAt: '2026-11-02T16:00:00+08:00',
      pending: { quantity: 2, changes: [{ attributeName: '力量', oldValue: 10, newValue: 8, change: -2 }, { attributeName: '智慧', oldValue: 10, newValue: 13, change: 3 }] }
    } } };
    value.data.conversationPreview = { reference: value.data.result.reference, text: '原培元结果\n已消耗丹药：2\n力量：10 → 8（变化 -2）\n智慧：10 → 13（变化 3）\n原有效期至：2026-11-02T16:00:00+08:00\n放弃不会返还已消耗丹药。' };
    rememberGameplay('get_peiyuan_confirmation', value);
    rememberConfirmation('get_peiyuan_confirmation', value);
    const text = confirmationPreviewText('get_peiyuan_confirmation', value) + '\n' + confirmationOptions();
    const [message] = useMessage();
    assertMessageDelivered(await message.send({ format: createChatReplyFormat(text, 'qq-bot') }));
    endGuidance(event);
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(result.errors, []);
  const nodes = JSON.stringify(result.messages[0].nodes);
  for (const fact of ['已消耗丹药：2', '力量：10 → 8', '变化 -2', '智慧：10 → 13', '放弃不会返还', '保留培元结果', '放弃培元结果']) assert.ok(nodes.includes(fact));
});


test('provider declares cancellation notice, lookup retry and optional parameter binding for an unknown action', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const declaration = { previewAction: 'preview_custom', action: 'confirm_custom', title: '保留自定义结果', cancelAction: 'discard_custom', cancelTitle: '放弃自定义结果',
    kind: 'j', field: 'reference', cancelRequiresDecision: true, decisionNotice: '插件说明：放弃不会返还原材料。', retryPolicy: 'lookup', optionalBind: ['task'] };
  const actions = new Set(['preview_custom', 'confirm_custom', 'discard_custom']);
  const definitions = readConfirmationTargets([declaration], actions);
  assert.throws(() => readConfirmationTargets([{ ...declaration, retryPolicy: 'recreate' }], actions));
  assert.throws(() => readConfirmationTargets([{ ...declaration, cancelAction: undefined }], actions));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'custom-decision', messageId: 'preview' });
  const reference = `r1_1_j_1_${'d'.repeat(24)}`;
  let keep, discard;
  const preview = await app.runHandler(async () => {
    const value = { ok: true, data: { success: true, branch: 'business', result: { reference } } };
    rememberGameplay('preview_custom', value);
    rememberConfirmation('preview_custom', value, {}, definitions);
    keep = guidanceSession().offers.find(offer => offer.action === 'confirm_custom').label;
    discard = guidanceSession().offers.find(offer => offer.action === 'discard_custom').label;
    const text = confirmationOptions();
    const [message] = useMessage();
    assertMessageDelivered(await message.send({ format: createChatReplyFormat(text, 'qq-bot') }));
    acknowledgeConfirmationOptions(text);
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(preview.errors, []);
  assert.ok(JSON.stringify(preview.messages[0].nodes).includes(declaration.decisionNotice));
  const cancel = await app.runHandler(handler, { ...event, MessageId: 'ask-cancel', MessageText: '取消' }, 'alemonjs-agent-link');
  assert.deepEqual(cancel.errors, []);
  assert.ok(JSON.stringify(cancel.messages[0].nodes).includes(discard));
  assert.ok(cancel.messages[0].text.includes(declaration.decisionNotice));
  const chosen = await app.runHandler(async () => {
    assert.ok(confirmationGate('confirm_custom', { reference, task: 'new task' }, definitions));
    assert.equal(confirmationGate('confirm_custom', { reference }, definitions), undefined);
    assert.ok(confirmationGate('confirm_custom', { reference }, definitions), 'lookup policy applies without a hardcoded action name');
  }, { ...event, MessageId: 'keep', MessageText: keep }, 'alemonjs-agent-link');
  assert.deepEqual(chosen.errors, []);
  const opposite = await app.runHandler(async () => {
    assert.ok(confirmationGate('discard_custom', { reference }, definitions));
    endGuidance(event);
  }, { ...event, MessageId: 'discard', MessageText: discard }, 'alemonjs-agent-link');
  assert.deepEqual(opposite.errors, []);
});

for (const matched of [true, false]) test(`provider preview text is bound to its original reference: matched=${matched}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: `provider-facts-${matched}`, messageId: 'preview' });
  const reference = `r1_1_s_1_${'e'.repeat(24)}`;
  const value = { ok: true, data: { success: true, branch: 'business', result: { reference }, conversationPreview: {
    reference: matched ? reference : reference.replace('_s_', '_b_'), text: '修仙插件原方案：消耗7份材料，有效期以本方案为准。'
  } } };
  const run = await app.runHandler(async () => {
    rememberGameplay('preview_shop_purchase', value);
    rememberConfirmation('preview_shop_purchase', value);
    const facts = confirmationPreviewText('preview_shop_purchase', value);
    if (!matched) {
      assert.equal(facts, '');
      assert.equal(guidanceSession().offers?.length ?? 0, 0);
    } else {
      assert.equal(facts, value.data.conversationPreview.text, 'host must not regenerate plugin facts');
      const [message] = useMessage();
      const text = facts + '\n' + confirmationOptions();
      assertMessageDelivered(await message.send({ format: createChatReplyFormat(text, 'qq-bot') }));
      acknowledgeConfirmationOptions(text);
      assert.equal(guidanceSession().offers[0].shown, true);
    }
    endGuidance(event);
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(run.errors, []);
  assert.equal(run.messages.length, matched ? 1 : 0);
  if (matched) assert.ok(JSON.stringify(run.messages[0].nodes).includes(value.data.conversationPreview.text));
});


test('provider followup declaration binds a new action to an original result field', () => {
  const declaration = { action: 'consume_new', title: '确认新操作', notice: '本次使用指定材料。', fields: [], followups: [{ action: 'read_new_reference', inputField: 'original', resultPath: ['pending', 'digest'] }] };
  const definitions = readPreparationTargets([declaration], new Set(['consume_new', 'read_new_reference']));
  const receipt = { ok: true, data: { success: true, branch: 'business', result: { pending: { digest: 'original-value' } } } };
  assert.equal(permitsPreparationFollowup('consume_new', 'read_new_reference', { original: 'original-value' }, receipt, definitions), true);
  assert.equal(permitsPreparationFollowup('consume_new', 'read_new_reference', { original: 'latest-value' }, receipt, definitions), false);
  assert.equal(permitsPreparationFollowup('consume_new', 'read_new_reference', { original: 'original-value', other: 1 }, receipt, definitions), false);
  assert.equal(permitsPreparationFollowup('consume_new', 'read_new_reference', { original: 'original-value' }, { ok: false }, definitions), false);
  assert.throws(() => readPreparationTargets([declaration], new Set(['consume_new'])));
  assert.throws(() => readPreparationTargets([{ ...declaration, followups: [{ ...declaration.followups[0], resultPath: ['__proto__'] }] }], new Set(['consume_new', 'read_new_reference'])));
});

for (const scenario of ['missing', 'mismatched', 'valid']) test(`provider-required preview controls confirmation creation: ${scenario}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ userId: `required-preview-${scenario}`, messageId: 'original' });
  const definitions = readConfirmationTargets([{ previewAction: 'preview_new_service', action: 'commit_new_service', title: '确认本方案', kind: 'f', field: 'reference', requiresPreview: true }], new Set(['preview_new_service', 'commit_new_service']));
  const reference = ref('a');
  const payload = { ok: true, data: { success: true, branch: 'business', result: { reference, expiresAt: 'original-expiry', preview: { name: 'raw-name', paid: 'raw-price', buyCount: 1, granted: 1 } },
    ...(scenario === 'missing' ? {} : { conversationPreview: { reference: scenario === 'valid' ? reference : ref('b'), text: '提供方原方案：数量和费用由本方案说明。' } }) } };
  const run = await app.runHandler(async () => {
    rememberGameplay('preview_new_service', payload);
    rememberConfirmation('preview_new_service', payload, {}, definitions);
    assert.equal(guidanceSession().offers?.length ?? 0, scenario === 'valid' ? 1 : 0);
    const facts = confirmationPreviewText('preview_new_service', payload, definitions);
    assert.equal(facts, scenario === 'valid' ? payload.data.conversationPreview.text : '', 'host must not format raw business data');
    if (scenario === 'valid') {
      const sent = await useMessage()[0].send({ format: createChatReplyFormat(facts + '\n' + confirmationOptions(), event.Platform) });
      assertMessageDelivered(sent);
    }
    endGuidance(event);
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(run.errors, []);
  assert.equal(run.messages.length, scenario === 'valid' ? 1 : 0);
  if (scenario === 'valid') assert.ok(JSON.stringify(run.messages[0].nodes).includes(payload.data.conversationPreview.text));
});


test('selector binding preserves original strings without business field normalization', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ userId: 'exact-selector', messageId: 'preview' });
  const definitions = readConfirmationTargets([{ previewAction: 'inspect_selection', action: 'apply_selection', title: '确认原选择', kind: 'f', field: 'reference', bind: ['keyword'] }], new Set(['inspect_selection', 'apply_selection']));
  const reference = ref('a');
  let label;
  const preview = await app.runHandler(async () => {
    const payload = { ok: true, data: { success: true, branch: 'business', result: { reference } } };
    rememberGameplay('inspect_selection', payload);
    rememberConfirmation('inspect_selection', payload, { keyword: '  original  ' }, definitions);
    assert.equal(guidanceSession().offers[0].arguments.keyword, '  original  ');
    label = guidanceSession().offers[0].label;
    const text = confirmationOptions();
    assertMessageDelivered(await useMessage()[0].send({ format: createChatReplyFormat(text, event.Platform) }));
    acknowledgeConfirmationOptions(text);
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(preview.errors, []);
  const selected = await app.runHandler(async () => {
    assert.ok(confirmationGate('apply_selection', { reference, keyword: 'original' }, definitions));
    assert.equal(confirmationGate('apply_selection', { reference, keyword: '  original  ' }, definitions), undefined);
    endGuidance(event);
  }, { ...event, MessageId: 'choice', MessageText: label }, 'alemonjs-agent-link');
  assert.deepEqual(selected.errors, []);
});
