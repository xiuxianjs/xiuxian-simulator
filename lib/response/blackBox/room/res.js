import { parseBlackBoxRoom } from "../../../api/schemas/black-box.js";
import { createBlackBoxContext, onBlackBoxResponse, roomInput, validRoomArgs } from "../shared.js";
import { renderRoom } from "../roomView.js";

//#region src/response/blackBox/room/res.ts
var res_default = onBlackBoxResponse(async (e) => {
	const view = createBlackBoxContext(e);
	if (!validRoomArgs(view.args, 2)) {
		view.usage();
		await view.send();
		return;
	}
	try {
		const { args, call, send } = view;
		const input = roomInput(args);
		const room = await call("black-box.room", { ...input }, parseBlackBoxRoom);
		if (!room) return;
		renderRoom(room, input.eventId, view);
		await send();
	} catch (error) {
		await view.recover(error);
	}
});

//#endregion
export { res_default as default };