import { createBackendRequestContext } from "../../api/bot/context.js";
import { BackendAPIError } from "../../api/bot/client.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { parseDisruptionResult, parseParticipationResult } from "../../api/schemas/public-tribulation.js";
import { parseTribulationEvasionResult, parseTribulationHeartDemon, parseTribulationPreparation, parseTribulationReceipt } from "../../api/schemas/tribulation.js";
import { parseTribulationConfirmationQuery } from "../../api/bot/tribulation-confirmation-query.js";
import { selects } from "../config.js";
import { loadFinalBusiness } from "../finalBusiness.js";
import { parseTribulationCommand, runTribulationCommand, tribulationStartCommand } from "../../response-apps/tribulation/app.js";
import { renderTribulationPanel } from "./render.js";
import { onResponse, useEvent } from "alemonjs";

//#region src/response/tribulation/res.ts
var res_default = onResponse(selects, async (e) => {
	const [, next] = useEvent();
	const [message] = useMessage$1();
	const reference = (e.MessageText ?? "").trim().match(/^[/#!！＃]?(?:渡劫开劫|心魔回答)\s+(r1_[a-z0-9]+_[th]_[a-z0-9]+_[a-f0-9]{24})$/)?.[1];
	const command = reference ? {
		kind: "reference",
		reference
	} : parseTribulationCommand(e.MessageText ?? "");
	if (!command) {
		const panel = await runTribulationCommand(e.MessageText ?? "", { uid: 0 });
		await message.send(renderTribulationPanel(panel, {
			isPrivate: e.isPrivate ?? false,
			bid: e.UserId
		}));
		return;
	}
	const business = await loadFinalBusiness(e, next, "tribulation.command", command ?? { kind: "invalid" }, (value) => value);
	if (business.handled) return;
	let responseValue;
	const raw = async () => responseValue = await business.load();
	const startReceipt = async (receipt) => {
		const value = await raw();
		if (value.startFailure) {
			const error = receipt ? value.receiptFailure : value.startFailure;
			throw new BackendAPIError(error.message, error.code, receipt ? value.receiptStatus : value.startStatus, void 0, error.details);
		}
		return parseTribulationReceipt(value);
	};
	let presentationText = e.MessageText ?? "";
	if (reference) {
		let resolved;
		try {
			resolved = (await raw()).resolvedCommand;
		} catch (error) {
			await message.send(renderTribulationPanel({
				title: "操作未完成",
				sections: [{
					lines: [error instanceof BackendAPIError ? error.message : "结果暂未确认，请查看状态或重试原指令。"],
					buttons: [{
						label: "重试原确认",
						command: e.MessageText ?? ""
					}, {
						label: "我的劫云",
						command: "/我的渡劫"
					}]
				}]
			}, {
				isPrivate: e.isPrivate ?? false,
				bid: e.UserId
			}));
			return;
		}
		if (resolved?.kind === "start" && resolved.input) presentationText = tribulationStartCommand({
			...resolved.input,
			eventId: resolved.eventId
		});
		else if (resolved?.kind === "heartAnswer") presentationText = `/心魔回答 ${resolved.eventId} ${resolved.choice} ${resolved.policyVersion}`;
		else throw new Error("Missing resolved confirmation");
	}
	const panel = await runTribulationCommand(presentationText, {
		uid: e.uid,
		bid: e.UserId,
		request: createBackendRequestContext(e)
	}, {
		overview: raw,
		open: async () => parseTribulationPreparation(await raw()),
		confirm: async () => parseTribulationConfirmationQuery(await raw()),
		receipt: () => startReceipt(true),
		start: () => startReceipt(false),
		answerHeartDemon: async () => parseTribulationHeartDemon(await raw()),
		evade: async () => parseTribulationEvasionResult(await raw()),
		participate: async (_bid, _uid, eventId) => parseParticipationResult(await raw(), eventId),
		disrupt: async (_bid, _uid, eventId) => parseDisruptionResult(await raw(), eventId)
	});
	const confirmationReference = reference ?? responseValue?.confirmationReference;
	if (typeof confirmationReference === "string" && /^r1_[a-z0-9]+_[th]_[a-z0-9]+_[a-f0-9]{24}$/.test(confirmationReference)) {
		for (const section of panel.sections) for (const button of section.buttons ?? []) if (/^\/(渡劫开劫|心魔回答)\s/.test(button.command)) button.command = `${button.command.split(" ")[0]} ${confirmationReference}`;
	}
	await message.send(renderTribulationPanel(panel, {
		isPrivate: e.isPrivate ?? false,
		bid: e.UserId
	}));
});

//#endregion
export { res_default as default };