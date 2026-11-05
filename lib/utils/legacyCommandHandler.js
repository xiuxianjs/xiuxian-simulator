import { getCommandPrefix, getCommandSpace, hasCommandPrefix, internalCommandText } from "./commandPrefix.js";
import { getCurrentNext, withEventContext } from "alemonjs";

//#region src/utils/legacyCommandHandler.ts
/** 框架完成前缀匹配后，为旧业务解析器提供 / 指令；放行前恢复公共事件。 */
function legacyCommandHandler(value) {
	if (typeof value === "function") {
		const handler = value;
		return async (event, next) => {
			const original = event.MessageText;
			if (typeof original !== "string" || !original || ![
				"message.create",
				"private.message.create",
				"interaction.create",
				"private.interaction.create"
			].includes(event.name)) return handler(event, next);
			const prefix = getCommandPrefix();
			const normalized = hasCommandPrefix(original, prefix, false) ? internalCommandText(original, prefix) : "/" + original.trimStart();
			const hookNext = getCurrentNext() ?? next;
			let forwarded = false;
			const restore = () => {
				const current = event.MessageText;
				event.MessageText = current !== normalized && current !== original && current?.startsWith("/") ? getCommandPrefix() + (getCommandSpace() ? " " : "") + current.slice(1) : original;
			};
			const forward = (continuation, args) => {
				if (forwarded) return;
				forwarded = true;
				restore();
				return continuation(...args);
			};
			event.MessageText = normalized;
			try {
				return await withEventContext(event, (...args) => forward(hookNext, args), () => handler(event, (...args) => forward(next, args)));
			} finally {
				if (!forwarded) restore();
			}
		};
	}
	if (!value || typeof value !== "object") return value;
	const node = value;
	if ("default" in node) return {
		...node,
		default: legacyCommandHandler(node.default)
	};
	if ("current" in node) return {
		...node,
		current: Array.isArray(node.current) ? node.current.map(legacyCommandHandler) : legacyCommandHandler(node.current)
	};
	return value;
}

//#endregion
export { legacyCommandHandler };