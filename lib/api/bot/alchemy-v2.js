import { BackendAPIError } from "./client.js";
import { validMiddlewareNav } from "./middleware-entry.js";

//#region src/api/bot/alchemy-v2.ts
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const button = (value) => record(value) && typeof value.label === "string" && typeof value.command === "string";
function parseAlchemyV2Reply(value) {
	if (!record(value) || value.nav !== void 0 && !validMiddlewareNav(value.nav) || ![
		"title",
		"heading",
		"text"
	].every((key) => typeof value[key] === "string") || !Array.isArray(value.buttons) || !value.buttons.every(button) || !Array.isArray(value.advice) || !value.advice.every((tip) => record(tip) && typeof tip.command === "string" && typeof tip.description === "string") || value.blocks !== void 0 && (!Array.isArray(value.blocks) || !value.blocks.every((block) => record(block) && typeof block.text === "string" && typeof block.quoted === "boolean" && (block.inlineButtons === void 0 || Array.isArray(block.inlineButtons) && block.inlineButtons.every(button))))) throw new BackendAPIError("炼丹响应不完整，请稍后重试", "SDK_INVALID_RESPONSE");
	return value;
}

//#endregion
export { parseAlchemyV2Reply };