import { Agent } from "node:http";
import { Agent as Agent$1 } from "node:https";

//#region src/api/bot/connection-pools.ts
const backendConnectionPools = {
	httpAgent: new Agent({
		keepAlive: true,
		scheduling: "lifo"
	}),
	httpsAgent: new Agent$1({
		keepAlive: true,
		scheduling: "lifo"
	})
};

//#endregion
export { backendConnectionPools };