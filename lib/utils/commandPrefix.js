import { getAppConfig } from "./appConfig.js";
import { Format, getConfig } from "alemonjs";

//#region src/utils/commandPrefix.ts
/** 新版框架配置优先；旧插件配置仅作兼容。 */
function getNativeCommand() {
	const apps = getConfig().value?.apps;
	const entry = apps && !Array.isArray(apps) ? apps["xiuxian-game"] : void 0;
	return entry && typeof entry === "object" && entry.enabled !== false ? entry.command : void 0;
}
const getCommandSpace = () => getNativeCommand()?.space ?? false;
function sourceCommand(command) {
	const format = getNativeCommand()?.format;
	if (format?.enabled && format.match && new RegExp(format.match).exec(command)?.index === 0) return command;
	return /^[\u3400-\u9fff]/.test(command) ? "/" + command : command;
}
function projectedCommand(command) {
	const policy = getNativeCommand();
	const format = policy?.format;
	if (!policy || !format?.enabled || !format.match) return command;
	const regex = new RegExp(format.match);
	const body = regex.exec(command)?.index === 0 ? command.replace(regex, format.replacement ?? "") : void 0;
	return body ? policy.prefix + (policy.space ? " " : "") + body : command;
}
const prefixes = /* @__PURE__ */ new WeakMap();
const bareCommands = /* @__PURE__ */ new WeakMap();
/** 路由和消息出口共用；修改配置后重启机器人。 */
function getCommandPrefix() {
	const native = getNativeCommand();
	if (native) return native.prefix;
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
	if (getNativeCommand()) return false;
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
function hasCommandPrefix(text, prefix = getCommandPrefix(), allowBare = getCommandAllowBare(), space) {
	if (space === void 0 && arguments.length < 2) {
		const native = getNativeCommand();
		if (native) space = native.space ?? false;
	}
	const value = text.trimStart().replace(/^notAutoConfirmation:/, "");
	if (space !== void 0 && value.startsWith(prefix)) {
		const rest = value.slice(prefix.length);
		return space ? /^[ \t]+[\p{L}\p{N}]/u.test(rest) : /^[\p{L}\p{N}]/u.test(rest);
	}
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
	if (arguments.length < 2 && getNativeCommand()) {
		const source = sourceCommand(command);
		if ([...projectedCommand(source)].length > 80) throw new Error("配置前缀后的按钮指令超过 80 字符，请缩短前缀或重新生成预览");
		return source;
	}
	const result = formatCommandText(command, prefix);
	if (prefix !== "/" && hasCommandPrefix(result, prefix, false) && [...result].length > 80) throw new Error("配置前缀后的按钮指令超过 80 字符，请缩短前缀或重新生成预览");
	return result;
}
/** 普通文字中的可执行指令；与按钮源数据分开，不依赖 format 开关。 */
function displayCommandText(command) {
	const policy = getNativeCommand();
	if (!policy) return commandText(command);
	return policy.prefix + (policy.space ? " " : "") + command.replace(/^[/#＃!！]\s*/, "");
}
/** 校验最终发送长度，不修改节点，不截断凭据。 */
function assertCommandBudget(format) {
	const walk = (value) => {
		if (Array.isArray(value)) {
			value.forEach(walk);
			return;
		}
		if (!value || typeof value !== "object") return;
		const node = value;
		const options = node.options;
		if ((node.type === "Button" || node.type === "MD.button") && options && (options.type === void 0 || options.type === "command") && typeof options.data === "string") {
			let projected = options.data;
			const apps = getConfig().value?.apps;
			const target = typeof options.commandTarget === "string" && apps && !Array.isArray(apps) ? apps[options.commandTarget] : void 0;
			const policy = options.commandTarget === false ? void 0 : typeof options.commandTarget === "string" ? target && typeof target === "object" && target.enabled !== false ? target.command : void 0 : getNativeCommand();
			const rule = policy?.format;
			if (policy && rule?.enabled && rule.match) {
				const regex = new RegExp(rule.match);
				if (regex.exec(projected)?.index === 0) {
					const body = projected.replace(regex, rule.replacement ?? "");
					if (body) projected = policy.prefix + (policy.space ? " " : "") + body;
				}
			}
			if ([...projected].length > 80) throw new Error("配置前缀后的按钮指令超过 80 字符，请缩短前缀或重新生成预览");
		}
		if (node.value && typeof node.value === "object") walk(node.value);
	};
	walk(format instanceof Format ? format.value : format);
}
function prefixCommandData(value) {
	if (value instanceof Format) return prefixCommandFormat(value);
	const format = Format.create();
	format.value.push(...value);
	return prefixCommandFormat(format).value;
}
/** 预算校验使用实际前缀，超预算由校验器报告而不是提前抛错。 */
const commandCharacterLength = (command) => {
	return [...getNativeCommand() ? projectedCommand(sourceCommand(command)) : formatCommandText(command, getCommandPrefix())].length;
};
/** 旧处理器和 Go 仍使用原始的 / 指令契约；仅在本包处理期间转换。 */
function internalCommandText(text, prefix = getCommandPrefix()) {
	if (text.startsWith("notAutoConfirmation:")) return "notAutoConfirmation:" + internalCommandText(text.slice(20), prefix);
	const value = text.trimStart();
	return value.startsWith(prefix) ? "/" + value.slice(prefix.length).trimStart() : text;
}
/** 克隆整棵树，覆盖直接构造的 MD.button、引用块和全局键盘。 */
function prefixCommandFormat(format) {
	const walk = (nodes) => nodes.map((raw) => {
		if (!raw || typeof raw !== "object") return raw;
		const node = raw;
		const button = node.type === "MD.button" || node.type === "Button";
		return {
			...node,
			...button && node.options?.commandTarget === void 0 && (node.options?.type === void 0 || node.options.type === "command") && typeof node.options?.data === "string" ? { options: {
				...node.options,
				data: commandText(node.options.data)
			} } : {},
			...Array.isArray(node.value) ? { value: walk(node.value) } : {}
		};
	});
	const result = Format.create();
	result.value.push(...walk(format.value));
	assertCommandBudget(result);
	return result;
}
function prefixOutgoingCommands(content) {
	return {
		...content,
		...content.keyboard ? { keyboard: {
			...content.keyboard,
			rows: content.keyboard.rows?.map((row) => row.map((button) => button.action.type !== "command" ? button : {
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
export { assertCommandBudget, commandCharacterLength, commandText, displayCommandText, getCommandAllowBare, getCommandPrefix, getCommandSpace, getNativeCommand, hasCommandPrefix, internalCommandText, prefixCommandData, prefixCommandFormat, prefixOutgoingCommands };