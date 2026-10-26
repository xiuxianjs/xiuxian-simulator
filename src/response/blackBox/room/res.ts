import { parseBlackBoxRoom } from '@src/api/schemas/black-box';
import { renderRoom } from '../roomView';
import { onBlackBoxResponse, createBlackBoxContext, validRoomArgs, roomInput } from '../shared';

export default onBlackBoxResponse(async e => {
  const view = createBlackBoxContext(e);

  if (!validRoomArgs(view.args, 2)) {
    view.usage();
    await view.send();

    return;
  }
  try {
    const { args, call, send } = view;
    const input = roomInput(args);
    const room = await call('black-box.room', { ...input }, parseBlackBoxRoom);

    if (!room) {
      return;
    }
    renderRoom(room, input.eventId, view);
    await send();
  } catch (error) {
    await view.recover(error);
  }
});
