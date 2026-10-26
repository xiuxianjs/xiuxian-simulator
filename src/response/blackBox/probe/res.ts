import { parseBlackBoxRoom } from '@src/api/schemas/black-box';
import { renderRoom } from '../roomView';
import { onBlackBoxResponse, createBlackBoxContext, validRoomArgs, roomInput } from '../shared';

export default onBlackBoxResponse(async e => {
  const view = createBlackBoxContext(e);

  if (!validRoomArgs(view.args, 3)) {
    view.usage();
    await view.send();

    return;
  }
  try {
    const { args, call, send } = view;
    const input = roomInput(args);
    const room = await call('black-box.probe', { ...input, ...(args[2] === '全部' ? { all: true } : { direction: args[2] }) }, parseBlackBoxRoom);

    if (!room) {
      return;
    }
    renderRoom(room, input.eventId, view);
    await send();
  } catch (error) {
    await view.recover(error);
  }
});
