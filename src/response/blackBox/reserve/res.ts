import { parseBlackBoxReservation } from '@src/api/schemas/black-box';
import { renderReservation } from '../reservationView';
import { onBlackBoxResponse, createBlackBoxContext, roomInput, validRoomArgs } from '../shared';

export default onBlackBoxResponse(async e => {
  const view = createBlackBoxContext(e);
  const { args, call, send, usage } = view;

  if (!validRoomArgs(args.slice(0, 2), 2) || (args.length !== 2 && !(args.length === 3 && args[2] === '关闭'))) {
    usage();
    await send();

    return;
  }
  const input = roomInput(args);

  try {
    const reservation = await call('black-box.reservation', { ...input, action: args[2] === '关闭' ? 'unsubscribe' : 'subscribe' }, parseBlackBoxReservation);

    if (!reservation) {
      return;
    }
    renderReservation(reservation, view, input.eventId);
    await send();
  } catch (error) {
    await view.recover(error, '通知设置结果待确认，请刷新本人记录；不会代替你入场或退队。');
  }
});
