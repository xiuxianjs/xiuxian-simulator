import { parseBlackBoxRoom } from '@src/api/schemas/black-box';
import { renderRoom } from '../roomView';
import { onBlackBoxResponse, createBlackBoxContext, validRoomArgs, roomInput, bidInputHelp, bidAmount } from '../shared';

export default onBlackBoxResponse(async e => {
  const view = createBlackBoxContext(e);

  if (!validRoomArgs(view.args, 3)) {
    bidInputHelp(view);
    await view.send();

    return;
  }
  try {
    const { args, call, send } = view;
    const input = roomInput(args);
    const amount = bidAmount(view);

    if (amount === undefined) {
      await send();

      return;
    }
    const room = await call('black-box.bid', { ...input, amount }, parseBlackBoxRoom);

    if (!room) {
      return;
    }
    renderRoom(room, input.eventId, view);
    await send();
  } catch (error) {
    await view.recover(error);
  }
});
