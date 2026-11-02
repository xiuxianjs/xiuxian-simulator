import { Expose, Format, getCurrentEvent } from "alemonjs";

//#region src/response/onboarding/aiNarration.ts
async function appendAINarration(md, text) {
	let timer;
	try {
		const client = Expose.create();
		if (!client.list().some((provider) => provider.name === "alemonjs-agent-link" && provider.protocol === "agent.presentation.v1")) return;
		const result = await Promise.race([client.call("agent.presentation.v1", "alemonjs-agent-link", "narrate", { text: text.slice(0, 12e3) }), new Promise((resolve) => {
			timer = setTimeout(() => resolve(null), 8500);
		})]);
		if (!result?.ok) return;
		const value = result.data;
		if (typeof value.text === "string" && value.text.trim() && value.text.length <= 200) md.addNewline().addBlockquote(Format.createMarkdown().addText(value.text));
	} catch {} finally {
		if (timer) clearTimeout(timer);
	}
}
const narratorNames = /* @__PURE__ */ new WeakMap();
async function guideText(text) {
	const event = getCurrentEvent();
	if (!event) return text.replace(/\{\{guide\.name\}\}/gu, "系统");
	let name = narratorNames.get(event);
	if (!name) {
		name = (async () => {
			let timer;
			try {
				const client = Expose.create();
				if (!client.list().some((p) => p.name === "alemonjs-agent-link" && p.protocol === "agent.presentation.v1" && p.actions.narrator)) return "系统";
				const result = await Promise.race([client.call("agent.presentation.v1", "alemonjs-agent-link", "narrator", {}), new Promise((resolve) => {
					timer = setTimeout(() => resolve(null), 1e3);
				})]);
				const value = result?.ok ? result.data.name : void 0;
				return typeof value === "string" && value.trim() && [...value].length <= 40 && !/[\r\n]/u.test(value) ? value : "系统";
			} catch {
				return "系统";
			} finally {
				if (timer) clearTimeout(timer);
			}
		})();
		narratorNames.set(event, name);
	}
	const resolved = await name;
	return text.replace(/\{\{guide\.name\}\}/gu, resolved).replace(/^系统(?=[:： ·])/gmu, resolved);
}

//#endregion
export { appendAINarration, guideText };