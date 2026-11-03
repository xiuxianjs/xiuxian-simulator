import { authorize, currentPlayer } from "./access.js";
import { object, project } from "./schema.js";
import { declareFreshObservation } from "./execution-policy.js";
import { Expose } from "alemonjs";

//#region src/expose/query.ts
/** Explicitly audited state observations; keeps the original effect and authorization. */
function observationQuery(...args) {
	const action = query(...args);
	declareFreshObservation(action.handler);
	return action;
}
function query(description, output, run, input = object({})) {
	return Expose.action({
		description,
		effect: "unknown",
		inputSchema: input,
		outputSchema: output,
		authorize,
		handler: async (args, context) => {
			const data = await run(await currentPlayer(context), args, context);
			context.signal.throwIfAborted();
			return project(output, data);
		}
	});
}

//#endregion
export { observationQuery, query };