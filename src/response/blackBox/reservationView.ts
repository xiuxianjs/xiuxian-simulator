import { formatGameTime } from '@src/utils/gameTime';
import { statusName, type parseBlackBoxReservation } from '@src/api/schemas/black-box';
import { admittedPhaseLabel, reminderPhaseLabel, clock, target, type Button, type BlackBoxContext } from './shared';

export function renderReservation(r: ReturnType<typeof parseBlackBoxReservation>, view: BlackBoxContext, eventId: number) {
  const { quote, privateChat } = view;
  const ref = target(eventId, r.roomId);

  if (r.notificationEnabled !== undefined) {
    quote([r.notificationEnabled ? '已订阅本场后续通知，不补发已过节点。' : '本场通知已关闭。', '通知设置不代替入场或退队，不改变报价及资金占用。']);
  }
  if (r.joinClosesAt) {
    const buttons: Button[] = [{ label: privateChat ? '刷新记录' : '本人记录（私聊）', command: '/黑盒记录' }];

    if (['reserved', 'waiting', 'admitted'].includes(r.status)) {
      buttons.push({ label: '通知我', command: `/黑盒提醒 ${ref}` }, { label: '取消通知', command: `/黑盒提醒 ${ref} 关闭` });
    }
    const now = Date.parse(r.serverTime);
    const joining = now >= Date.parse(r.opensAt) && now < Date.parse(r.joinClosesAt);

    if (r.status === 'reserved' && joining) {
      buttons.unshift({ label: '入场', command: `/黑盒入场 ${ref}` });
    }
    if (['reserved', 'waiting'].includes(r.status) && now < Date.parse(r.joinClosesAt)) {
      buttons.push({ label: r.status === 'waiting' ? '退队并取消通知' : '取消预约', command: `/黑盒取消 ${ref}` });
    }
    if (
      r.status === 'cancelled' &&
      now < Date.parse(r.joinClosesAt) &&
      formatGameTime(r.serverTime, 'YYYY-MM-DD') === formatGameTime(r.opensAt, 'YYYY-MM-DD')
    ) {
      buttons.unshift({ label: '返回本场入口', command: `/黑盒排期 ${formatGameTime(r.opensAt, 'HH:mm')}` });
    }
    if (r.status === 'admitted') {
      buttons.unshift({ label: privateChat ? '查看本组' : '私聊查看本组', command: `/黑盒详情 ${ref}` });
    }
    quote(
      [
        `${clock(r.opensAt)} · ${r.roomId.slice(-1)}入口`,
        r.status === 'reserved'
          ? reminderPhaseLabel(r.serverTime, r.opensAt, r.joinClosesAt)
          : r.status === 'waiting'
            ? '排队中 · 不占用资金'
            : r.status === 'admitted'
              ? admittedPhaseLabel(r.serverTime, r.groupStartsAt)
              : statusName[r.status],
        ...(['reserved', 'waiting'].includes(r.status) ? [`入场截止 ${clock(r.joinClosesAt)} · 3人即开，截止2人开，1人流拍`] : []),

        ...(r.groupStartsAt ? [`本组开拍：${clock(r.groupStartsAt)}`] : [])
      ],
      buttons
    );

    return;
  }
  const buttons: Button[] = [{ label: '我的记录', command: '/黑盒记录' }],
    now = Date.parse(r.serverTime),
    open = Date.parse(r.opensAt);

  if (r.status === 'reserved' && !r.confirmed && now >= open - 300000 && now < open) {
    buttons.push({ label: '确认参拍', command: `/黑盒确认 ${ref}` });
  }
  quote(
    [
      `${clock(r.opensAt)} · ${r.roomId.slice(-1)}入口 · ${statusName[r.status]}${r.confirmed ? ' · 已确认' : ''}`,
      r.status === 'cancelled' ? '' : '预约不扣款 · 开拍时复查资格与资金',
      ...(r.status === 'reserved' ? [`确认窗口：${clock(new Date(open - 300000).toISOString())}—${clock(r.opensAt)}`] : [])
    ],
    buttons
  );
}
