import { createBackendRequestContext } from "../api/bot/context.js";
import { requestBackend, writeContext } from "../api/bot/client.js";
import { invalidateEventBackendRobotIdentity } from "../api/bot/identity.js";
import { authorizedEvent } from "./access.js";
import { boolean, integer, list, object, project, text } from "./schema.js";
import { guideSchema, projectGuideReceipt } from "./guide-receipt.js";
import { onboardingSchema } from "./onboarding-schema.js";
import { middlewareInputFromEvent } from "../api/bot/middleware-entry.js";
import { isRobotPublicEntry, parseRobotBusinessEnvelope } from "../api/bot/robot-business.js";
import { invalidateEventCommandEntry } from "../api/bot/command-entry.js";
import { Expose, ExposeError } from "alemonjs";

//#region src/expose/mutation.ts
const button = object({
	label: text,
	command: text
});
/** A new snapshot for each call; mutations continue to use stable retry keys. */
function observation(description, operation, inputSchema, resultSchema, command, decode, argumentsFor = (input) => input, validateInput) {
	return mutation(description, operation, inputSchema, resultSchema, command, decode, argumentsFor, validateInput, { freshRead: true });
}
const replySchema = object({
	title: text,
	heading: text,
	text,
	buttons: list(button),
	advice: list(object({
		command: text,
		description: text
	})),
	quote: text,
	rawLines: list(text),
	nav: object({
		current: integer,
		total: integer,
		count: integer,
		command: text
	}),
	blocks: list(object({
		text,
		quoted: boolean,
		newline: boolean,
		inlineButtons: list(button)
	}, ["newline", "inlineButtons"]))
}, [
	"quote",
	"rawLines",
	"nav",
	"blocks"
]);
/** Dedicated actions only. The server owns identity, entry checks and settlement. */
function mutation(description, operation, inputSchema, resultSchema, command, decode, argumentsFor = (input) => input, validateInput, options = {}) {
	const outputSchema = object({
		success: boolean,
		branch: {
			type: "string",
			enum: ["business", "middleware"]
		},
		reason: text,
		replies: list(replySchema),
		guide: guideSchema,
		onboarding: onboardingSchema,
		onboardingPending: boolean,
		result: resultSchema
	}, [
		"result",
		"guide",
		"onboarding",
		"onboardingPending"
	]);
	return Expose.action({
		description,
		effect: "write",
		inputSchema,
		outputSchema,
		authorize: (input, context) => {
			validateInput?.(input);
			const event = authorizedEvent(context);
			if (!createBackendRequestContext(event).idempotencyKey) throw new ExposeError("FORBIDDEN", "写操作需要原始平台消息编号");
			return true;
		},
		handler: async (input, context) => {
			const event = authorizedEvent(context);
			const prepared = argumentsFor(input, event);
			const args = Object.fromEntries(Object.keys(prepared).sort().map((key) => [key, prepared[key]]));
			const messageText = command(input);
			const observation = options.freshRead ? `:read:${context.callId}` : "";
			const request = createBackendRequestContext(event, `expose:${operation}:${JSON.stringify([messageText, args])}${observation}`);
			context.signal.throwIfAborted();
			const middleware = middlewareInputFromEvent(event);
			if (operation === "daily-fortune.claim" && event.Target?.scope === "group") middleware.channelId = event.Target.targetId;
			const raw = await requestBackend(event.UserId, "post_v2_robot_business_operation", {
				path: { operation },
				body: {
					...middleware,
					messageText,
					arguments: args
				},
				...writeContext(request),
				signal: context.signal
			});
			const response = parseRobotBusinessEnvelope(raw, event.UserId, (data, uid) => decode(data, input, uid), isRobotPublicEntry(operation));
			if (operation === "account.register" && response.success && response.branch === "business" && response.data.code === "OK") {
				invalidateEventBackendRobotIdentity(event);
				invalidateEventCommandEntry(event);
			}
			context.signal.throwIfAborted();
			return project(outputSchema, {
				success: response.success,
				branch: response.branch,
				reason: response.middleware.reason,
				replies: response.middleware.replies,
				...response.middleware.guide ? { guide: projectGuideReceipt(response.middleware.guide) } : {},
				...response.success && response.branch === "business" && response.onboarding ? { onboarding: response.onboarding } : {},
				...response.success && response.branch === "business" && response.onboardingPending ? { onboardingPending: true } : {},
				...response.success && response.branch === "business" ? { result: response.data } : {}
			});
		}
	});
}

//#endregion
export { mutation, observation, replySchema };