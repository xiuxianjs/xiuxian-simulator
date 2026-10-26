import { parseBlackBoxReservation } from '@src/api/schemas/black-box';
import { renderReservation } from '../reservationView';
import { onBlackBoxResponse, createBlackBoxContext, roomInput, validRoomArgs } from '../shared';

export default onBlackBoxResponse(async e => {
  const view = createBlackBoxContext(e);
  const { args, call, send, usage } = view;

  if (!validRoomArgs(args, 2)) {
    usage();
    await send();

    return;
  }
  const input = roomInput(args);

  try {
    const reservation = await call('black-box.reservation', { ...input, action: 'confirm' }, parseBlackBoxReservation);

    if (!reservation) {
      return;
    }
    renderReservation(reservation, view, input.eventId);
    await send();
  } catch (error) {
    await view.recover(error, '预约结果待确认，请查看我的预约。');
  }
});
