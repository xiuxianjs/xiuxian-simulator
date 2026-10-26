import { currencyName, statusName, type BlackBoxRoom } from '@src/api/schemas/black-box';
import { formatGameTime } from '@src/utils/gameTime';
import { clock, target, type Button, type BlackBoxContext } from './shared';

export function renderRoom(room: BlackBoxRoom, eventId: number, view: BlackBoxContext) {
  const { quote } = view;
  const ref = target(eventId, room.roomId),
    money = currencyName[room.currency];

  view.setRoomFooter(ref, !room.result);
  const a = room.appraisal,
    d = a?.disclosure;
  const deadline = new Date(Date.parse(room.groupStartsAt ?? room.opensAt) + (room.phase === 'appraisal' ? 60000 : 180000)).toISOString();
  const remaining = Math.max(0, Math.ceil((Date.parse(deadline) - Date.parse(room.serverTime)) / 1000));

  quote([
    `${formatGameTime(room.opensAt, 'HH:mm')} · ${room.roomId.slice(-1)}入口${a ? ` · ${a.roomType}` : ''} · ${{ appraisal: '鉴宝中', bidding: '暗标中', closed: room.result ? '已结算' : '等待结算' }[room.phase]}`,
    ...(room.phase === 'closed' ? [] : [`${room.phase === 'appraisal' ? '鉴宝' : '暗标'}截止：${clock(deadline)} · 查询时剩余 ${remaining} 秒`]),
    ...(room.phase === 'closed' ? [] : [`状态截至 ${clock(room.serverTime)}，刷新查看最新状态`]),
    ...(room.phase !== 'closed' && room.revealsAt ? [`全场${formatGameTime(room.revealsAt, 'HH:mm')}起统一揭晓并结算，暗标截止后资金仍占用至结算。`] : []),
    `底价 ${room.floor}${money} · 占用 ${room.ownHeld} · 可用 ${room.available}`
  ]);
  if (room.phase === 'closed' && !room.result) {
    quote(
      [
        room.revealsAt && Date.parse(room.serverTime) < Date.parse(room.revealsAt)
          ? `本组暗标已截止；全场${formatGameTime(room.revealsAt, 'HH:mm')}统一揭晓并结算，资金暂保留。`
          : '结算中 · 资金暂未释放'
      ],
      [{ label: '刷新', command: `/黑盒详情 ${ref}` }]
    );
  }
  if (room.result) {
    const r = room.result;
    const inventoryButtons: Button[] =
      r.outcome === 'system_cancelled' ? [{ label: '本人记录', command: '/黑盒记录' }] : [{ label: '查看物品', command: '/储物袋' }];

    for (const [category, label, kind] of [
      ['equipment', '查看已获装备', '装备'],
      ['skill_book', '查看已获功法', '功法'],
      ['soul_artifact', '查看已获本命物', '本命']
    ] as const) {
      if (r.assets.some(asset => asset.category === category)) {
        inventoryButtons.push({ label, command: `/储物袋 ${kind}` });
      }
    }

    quote(
      [
        `${statusName[r.outcome]} · 已结算`,
        r.charged ? `成交支付 ${r.charged}${money}` : `${r.released}${money}已释放${r.releaseExpired ? '（已到期）' : ''}`,
        ...(r.explanation ? [r.explanation] : []),
        `第${r.activityDay}日参与补给 · ${r.dailySupplementGranted ? '已领取' : '未领取'}`,
        ...(r.assets.length ? ['本人所得', ...r.assets.map(x => `${x.name} ×${x.quantity}`)] : [])
      ],
      inventoryButtons
    );
  }
  if (room.phase === 'bidding') {
    quote(
      [`当前有效报价：${room.ownBid ? `${room.ownBid}${money}` : '尚未提交'}`, '竞得按最终报价支付；撤标仍占用底价至结算。'],
      [
        { label: `底价出价 ${room.floor}`, command: `/黑盒出价 ${ref} ${room.floor}` },
        { label: '自定报价', command: `/黑盒出价 ${ref} `, autoEnter: false },
        ...(room.ownBid ? [{ label: '撤回报价', command: `/黑盒撤标 ${ref}` }] : [])
      ]
    );
  }
  if (a && room.phase !== 'closed') {
    const buttons: Button[] =
      room.phase === 'appraisal' && a.remaining > 0
        ? a.probes.filter(p => p.answer === undefined).map(p => ({ label: p.label, command: `/黑盒鉴宝 ${ref} ${p.id}` }))
        : [];

    if (a.canRevealAll && a.remaining > 0 && room.phase === 'appraisal') {
      buttons.push({ label: '查齐两项', command: `/黑盒鉴宝 ${ref} 全部` });
    }
    quote(
      [
        room.phase === 'appraisal' ? `免费鉴宝 · 剩余${a.remaining}次` : '鉴宝已截止',
        ...(room.phase === 'appraisal' && a.remaining > 0 && a.decisionGuide ? [a.decisionGuide] : [])
      ],
      buttons.filter(button => button.command.endsWith(' 全部'))
    );
    for (const p of a.probes) {
      if (p.answer !== undefined) {
        quote([`已查 · ${p.label}`, p.answer]);
      } else if (room.phase === 'appraisal' && a.remaining > 0) {
        quote(
          [p.label, p.purpose ?? ''],
          buttons.filter(button => button.command === `/黑盒鉴宝 ${ref} ${p.id}`)
        );
      }
    }
  }
  if (d && room.phase !== 'closed') {
    quote([
      [d.type, d.grade, d.slot, d.quantity ? `固定${d.quantity}份` : '', d.seeds ? `${d.seeds}类种子` : ''].filter(Boolean).join(' · '),
      ...(d.use ? [d.use] : []),
      ...d.conditions,
      ...(d.upgrade ? [`升品：本体＋${d.upgrade.materials}件同名同品材料（共${d.upgrade.total}件），每件最多${d.upgrade.limit}次`] : [])
    ]);
  }
  if (room.content) {
    quote([
      `拍品揭晓：${room.content.title} · ${room.content.grade}`,
      ...(room.content.combinationSummary ? [room.content.combinationSummary] : []),
      ...(room.result?.outcome === 'won' &&
      room.result.assets.length === room.content.rewards.length &&
      room.content.rewards.every((reward, index) => {
        const asset = room.result!.assets[index];

        return reward.name === asset.name && reward.quantity === asset.quantity;
      })
        ? []
        : ['拍品清单（归属见结算）', ...room.content.rewards.map(r => `${r.name} ×${r.quantity}`)]),
      ...room.content.appraisals.map(
        p => `${p.label}（${a?.probes.some(selected => selected.id === p.id && selected.answer !== undefined) ? '本人已查' : '本人未查'}）：${p.answer ?? ''}`
      )
    ]);
  }
}
