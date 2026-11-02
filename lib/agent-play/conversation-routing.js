import { Expose } from "alemonjs";

//#region src/agent-play/conversation-routing.ts
/** A provider owns topic recognition. This read grants no execution authority. */
async function routePluginConversation(protocol, provider, continuation) {
	const client = Expose.create();
	const action = client.list().find((item) => item.protocol === protocol && item.name === provider)?.actions.route_conversation;
	if (!action) return "legacy";
	if (action.effect !== "read") return "unavailable";
	try {
		const result = await client.call(protocol, provider, "route_conversation", continuation, { timeoutMs: 1e3 });
		const data = result.ok ? result.data : void 0;
		return data?.protocol === "plugin-conversation-route.v1" && [
			"matched",
			"unmatched",
			"ambiguous"
		].includes(data.decision ?? "") ? data.decision : "unavailable";
	} catch {
		return "unavailable";
	}
}

//#endregion
export { routePluginConversation };