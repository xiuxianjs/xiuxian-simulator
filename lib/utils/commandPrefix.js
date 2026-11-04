import { getAppConfig } from "./appConfig.js";
import { Format, getConfig } from "alemonjs";

//#region src/utils/commandPrefix.ts
const prefixes = /* @__PURE__ */ new WeakMap();
const bareCommands = /* @__PURE__ */ new WeakMap();
/** 路由和消息出口共用；修改配置后重启机器人。 */
function getCommandPrefix() {
	const config = getConfig();
	const cached = prefixes.get(config);
	if (cached !== void 0) return cached;
	const prefix = getAppConfig().commandPrefix;
	if (prefix === void 0) {
		prefixes.set(config, "/");
		return "/";
	}
	if (typeof prefix !== "string" || !prefix.length || /\s/.test(prefix)) throw new Error("xiuxian-game.commandPrefix 必须是非空且不含空白的字符串");
	prefixes.set(config, prefix);
	return prefix;
}
/** 使用框架 routeText.allowBare；未配置前缀时保留裸指令兼容。 */
function getCommandAllowBare() {
	const config = getConfig();
	const cached = bareCommands.get(config);
	if (cached !== void 0) return cached;
	const settings = getAppConfig();
	const allowBare = settings.routeText?.allowBare;
	if (allowBare !== void 0 && typeof allowBare !== "boolean") throw new Error("xiuxian-game.routeText.allowBare 必须是布尔值");
	const value = allowBare ?? settings.commandPrefix === void 0;
	bareCommands.set(config, value);
	return value;
}
/** 文本命令必须使用当前配置前缀；前缀后直接跟命令，不接受叠加 /。 */
function hasCommandPrefix(text, prefix = getCommandPrefix(), allowBare = getCommandAllowBare()) {
	const value = text.trimStart().replace(/^notAutoConfirmation:/, "");
	return value.startsWith(prefix) ? /^[\p{L}\p{N}]/u.test(value.slice(prefix.length).trimStart()) : allowBare && /^[\p{L}\p{N}]/u.test(value);
}
/** 统一构造按钮、input 的完整命令；参数和凭据保持原文。 */
function formatCommandText(command, prefix) {
	const internal = "notAutoConfirmation:";
	if (command.startsWith(internal)) return internal + formatCommandText(command.slice(20), prefix);
	if (!command || /^https?:\/\//i.test(command) || command.startsWith(prefix)) return command;
	const body = command.replace(/^\//, "");
	return /^[\u3400-\u9fff]/.test(body) ? prefix + body : command;
}
function commandText(command, prefix = getCommandPrefix()) {
	const result = formatCommandText(command, prefix);
	if (prefix !== "/" && hasCommandPrefix(result, prefix, false) && [...result].length > 80) throw new Error("配置前缀后的按钮指令超过 80 字符，请缩短前缀或重新生成预览");
	return result;
}
/** 预算校验使用实际前缀，超预算由校验器报告而不是提前抛错。 */
const commandCharacterLength = (command) => [...formatCommandText(command, getCommandPrefix())].length;
/** 旧处理器和 Go 仍使用原始的 / 指令契约；仅在本包处理期间转换。 */
function internalCommandText(text, prefix = getCommandPrefix()) {
	if (text.startsWith("notAutoConfirmation:")) return "notAutoConfirmation:" + internalCommandText(text.slice(20), prefix);
	const value = text.trimStart();
	return value.startsWith(prefix) ? "/" + value.slice(prefix.length) : text;
}
/** 克隆整棵树，覆盖直接构造的 MD.button、引用块和全局键盘。 */
function prefixCommandFormat(format) {
	const walk = (nodes) => nodes.map((raw) => {
		if (!raw || typeof raw !== "object") return raw;
		const node = raw;
		const button = node.type === "MD.button" || node.type === "Button";
		return {
			...node,
			...button && node.options?.type !== "link" && typeof node.options?.data === "string" ? { options: {
				...node.options,
				data: commandText(node.options.data)
			} } : {},
			...Array.isArray(node.value) ? { value: walk(node.value) } : {}
		};
	});
	const result = Format.create();
	result.value.push(...walk(format.value));
	return result;
}
function prefixOutgoingCommands(content) {
	return {
		...content,
		...content.keyboard ? { keyboard: {
			...content.keyboard,
			rows: content.keyboard.rows?.map((row) => row.map((button) => button.action.type === "link" ? button : {
				...button,
				action: {
					...button.action,
					data: commandText(button.action.data)
				}
			}))
		} } : {}
	};
}

//#endregion
export { commandCharacterLength, commandText, getCommandAllowBare, getCommandPrefix, hasCommandPrefix, internalCommandText, prefixCommandFormat, prefixOutgoingCommands };