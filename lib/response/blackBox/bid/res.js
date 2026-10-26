import { parseBlackBoxRoom } from "../../../api/schemas/black-box.js";
import { bidAmount, bidInputHelp, createBlackBoxContext, onBlackBoxResponse, roomInput, validRoomArgs } from "../shared.js";
import { renderRoom } from "../roomView.js";

//#region src/response/blackBox/bid/res.ts
var res_default = onBlackBoxResponse(async (e) => {
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
		if (amount === void 0) {
			await send();
			return;
		}
		const room = await call("black-box.bid", {
			...input,
			amount
		}, parseBlackBoxRoom);
		if (!room) return;
		renderRoom(room, input.eventId, view);
		await send();
	} catch (error) {
		await view.recover(error);
	}
});

//#endregion
export { res_default as default };