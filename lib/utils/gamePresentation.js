import { advanceGamePresentation } from "../agent-play/game-progress.js";
import { Expose } from "alemonjs";

//#region src/utils/gamePresentation.ts
const observed = /* @__PURE__ */ new WeakSet();
/** Notify the optional AI presenter before a manual business request. */
async function beginGamePresentation(event) {
	if (observed.has(event)) return;
	observed.add(event);
	advanceGamePresentation();
	try {
		const client = Expose.create();
		if (!client.list().some((provider) => provider.name === "alemonjs-agent-link" && provider.protocol === "agent.presentation.v1" && provider.actions.begin_input)) return;
		await client.call("agent.presentation.v1", "alemonjs-agent-link", "begin_input", {});
	} catch {}
}

//#endregion
export { beginGamePresentation };