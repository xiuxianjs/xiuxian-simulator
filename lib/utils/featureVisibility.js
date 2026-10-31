import { getQQBotAppIds } from "./qqBotIdentity.js";
import { getBackendConfig } from "../api/bot/config.js";
import { presentationAccessFor } from "../api/bot/presentation-access-state.js";
import { getBackendPresentationAccess, parseBackendTianshuContent } from "../api/bot/tianshu-content.js";
import { Format, logger } from "alemonjs";

//#region src/utils/featureVisibility.ts
const runtimes = /* @__PURE__ */ new Map();
let activated = false;
const runtimeKey = () => {
	const config = getBackendConfig();
	return {
		config,
		key: JSON.stringify([config.url, config.robotAuthToken])
	};
};
const canonical = (value) => value.trim().replace(/^[!！/#＃]/, "").trim().replace(/\s+/g, " ");
function policyFrom(content) {
	if (content.gateVersion !== 1 || !content.commandFeatures || !content.featureCatalog) throw new Error("服务端缺少完整的气泡功能规则");
	const features = new Map(content.featureCatalog.flatMap((group) => group.features.map((feature) => [feature.id, feature])));
	const commands = Object.entries(content.commandFeatures);
	if (!commands.length || commands.some(([, feature]) => !features.has(feature))) throw new Error("气泡指令规则引用了未知功能");
	return {
		commands: commands.sort(([a], [b]) => b.length - a.length || a.localeCompare(b)),
		zero: new Set([...features].filter(([, feature]) => feature.realmReached).map(([id]) => id))
	};
}
/** Activate before loading: a failed startup must not expose a broad menu. */
async function startFeatureVisibility() {
	activated = true;
	const { config, key } = runtimeKey();
	if ((config.channelMode || process.env.login === "qq-bot") && !getQQBotAppIds().length) return;
	const runtime = runtimes.get(key) ?? {};
	runtimes.set(key, runtime);
	if (runtime.policy) return;
	runtime.pending ??= (async () => {
		if (!config.url || !config.robotAuthToken) throw new Error("后端 API 未配置");
		const response = await fetch(`${config.url}/api/v1/content/tianshu`, {
			headers: { Authorization: `Bearer ${config.robotAuthToken}` },
			signal: AbortSignal.timeout(config.timeoutMs)
		});
		if (!response.ok) throw new Error(`功能规则读取失败 (${response.status})`);
		const envelope = await response.json();
		runtime.policy = policyFrom(parseBackendTianshuContent(envelope.data));
	})();
	const pending = runtime.pending;
	try {
		await pending;
	} finally {
		if (runtime.pending === pending) runtime.pending = void 0;
	}
}
function featureFor(command, policy) {
	const text = canonical(command);
	return policy.commands.find(([alias]) => text === alias || text.startsWith(alias + " "))?.[1];
}
async function presentationCommandFilter(event) {
	const { key } = runtimeKey();
	const runtime = runtimes.get(key) ?? {};
	if (!activated) return () => true;
	runtimes.set(key, runtime);
	if (!runtime.policy) try {
		await startFeatureVisibility();
	} catch {}
	const policy = runtime.policy;
	if (!policy) return () => false;
	let reached = Object.fromEntries([...policy.zero].map((id) => [id, true]));
	if (event?.UserId) try {
		reached = await presentationAccessFor(event, () => getBackendPresentationAccess(event.UserId));
	} catch {
		logger.warn("气泡功能状态暂不可用，仅显示已确认的零门槛入口");
	}
	return Object.assign((command) => {
		const feature = featureFor(command, policy);
		return feature !== void 0 && reached[feature] === true;
	}, { known: (command) => featureFor(command, policy) !== void 0 });
}
/** Clone the message tree: quote snapshots, retries and shared templates stay intact. */
function filterFeatureText(text, allowed) {
	return text.split("\n").filter((line) => {
		return [...line.matchAll(/(?=(?:^|[\s·：:（(【[])([/!！#＃](?![/\s\d])[^/!！#＃\n\]】）)]*))/g)].map((match) => match[1]).every((command) => allowed.known && !allowed.known(command) ? true : allowed(command));
	}).join("\n");
}
function filterFeatureFormat(format, allowed) {
	const walk = (nodes) => nodes.flatMap((raw) => {
		if (!raw || typeof raw !== "object") return [raw];
		const node = raw;
		if (node.type === "MD.button" || node.type === "Button") {
			if (node.options?.type === "link") return [raw];
			if (typeof node.options?.data !== "string" || !node.options.data.trim() || !allowed(node.options.data)) return [];
		}
		if (Array.isArray(node.value)) {
			const value = walk(node.value);
			if (!value.length) return [];
			if (node.type === "MD.blockquote" && node.value[0]?.type === "MD.button" && !value.some((child) => child?.type === "MD.button")) return [];
			return [{
				...node,
				value
			}];
		}
		if (typeof node.value === "string" && [
			"Text",
			"MD.text",
			"MD.content",
			"MD.blockquote",
			"MarkdownOriginal"
		].includes(node.type)) {
			const value = filterFeatureText(node.value, allowed);
			return value || node.value === "" ? [{
				...node,
				value
			}] : [];
		}
		return [raw];
	});
	const result = Format.create();
	result.value.push(...walk(format.value));
	return result;
}
function filterOutgoingFeatures(content, allowed) {
	const keyboard = content.keyboard;
	const rows = keyboard?.rows?.map((row) => row.filter((button) => button.action.type === "link" || allowed(button.action.data))).filter((row) => row.length > 0);
	return {
		...content,
		...content.text !== void 0 ? { text: filterFeatureText(content.text, allowed) } : {},
		...content.markdown?.content !== void 0 ? { markdown: {
			...content.markdown,
			content: filterFeatureText(content.markdown.content, allowed)
		} } : {},
		...keyboard ? { keyboard: rows?.length ? { rows } : void 0 } : {}
	};
}

//#endregion
export { filterFeatureFormat, filterOutgoingFeatures, presentationCommandFilter, startFeatureVisibility };