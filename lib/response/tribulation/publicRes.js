import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { parsePublicTribulationEvent, parsePublicTribulationList } from "../../api/schemas/public-tribulation.js";
import { selects } from "../config.js";
import { loadFinalBusiness } from "../finalBusiness.js";
import { parsePublicTribulationCommand, runPublicTribulationCommand } from "../../response-apps/tribulation/public.js";
import { renderTribulationPanel } from "./render.js";
import { onResponse, useEvent } from "alemonjs";

//#region src/response/tribulation/publicRes.ts
var publicRes_default = onResponse(selects, async (e) => {
	const [, next] = useEvent();
	const [message] = useMessage$1();
	const command = parsePublicTribulationCommand(e.MessageText ?? "");
	const args = command?.kind === "observe" ? command : command?.kind === "list" ? {
		kind: "list",
		...command.filter,
		offset: (command.page - 1) * 5,
		limit: 6
	} : { kind: "invalid" };
	const business = await loadFinalBusiness(e, next, "tribulation.public", args, (value) => value);
	if (business.handled) return;
	const panel = await runPublicTribulationCommand(e.MessageText ?? "", e.UserId, {
		list: async () => parsePublicTribulationList(await business.load()),
		observe: async () => parsePublicTribulationEvent(await business.load())
	}, e.uid);
	await message.send(renderTribulationPanel(panel, {
		isPrivate: e.isPrivate ?? false,
		bid: e.UserId
	}));
});

//#endregion
export { publicRes_default as default };