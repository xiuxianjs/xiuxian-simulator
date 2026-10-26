import { parseBlackBoxReservation } from "../../../api/schemas/black-box.js";
import { createBlackBoxContext, onBlackBoxResponse, roomInput, validRoomArgs } from "../shared.js";
import { renderReservation } from "../reservationView.js";

//#region src/response/blackBox/cancel/res.ts
var res_default = onBlackBoxResponse(async (e) => {
	const view = createBlackBoxContext(e);
	const { args, call, send, usage } = view;
	if (!validRoomArgs(args, 2)) {
		usage();
		await send();
		return;
	}
	const input = roomInput(args);
	try {
		const reservation = await call("black-box.reservation", {
			...input,
			action: "cancel"
		}, parseBlackBoxReservation);
		if (!reservation) return;
		renderReservation(reservation, view, input.eventId);
		await send();
	} catch (error) {
		await view.recover(error, "预约结果待确认，请查看我的预约。");
	}
});

//#endregion
export { res_default as default };