import { accountOperationDefinitions } from "./domains/account/operations.js";
import { authOperationDefinitions } from "./domains/auth/operations.js";
import { battleOperationDefinitions } from "./domains/battle/operations.js";
import { benefitsOperationDefinitions } from "./domains/benefits/operations.js";
import { communityOperationDefinitions } from "./domains/community/operations.js";
import { crossPlatformOperationDefinitions } from "./domains/cross-platform/operations.js";
import { cultivationOperationDefinitions } from "./domains/cultivation/operations.js";
import { dungeonsOperationDefinitions } from "./domains/dungeons/operations.js";
import { equipmentOperationDefinitions } from "./domains/equipment/operations.js";
import { housingOperationDefinitions } from "./domains/housing/operations.js";
import { internalOperationDefinitions } from "./domains/internal/operations.js";
import { inventoryOperationDefinitions } from "./domains/inventory/operations.js";
import { mailOperationDefinitions } from "./domains/mail/operations.js";
import { marketOperationDefinitions } from "./domains/market/operations.js";
import { mentorshipOperationDefinitions } from "./domains/mentorship/operations.js";
import { notificationsOperationDefinitions } from "./domains/notifications/operations.js";
import { partnersOperationDefinitions } from "./domains/partners/operations.js";
import { paymentsOperationDefinitions } from "./domains/payments/operations.js";
import { playersOperationDefinitions } from "./domains/players/operations.js";
import { professionsOperationDefinitions } from "./domains/professions/operations.js";
import { rankingsOperationDefinitions } from "./domains/rankings/operations.js";
import { rewardsOperationDefinitions } from "./domains/rewards/operations.js";
import { sectCompetitionOperationDefinitions } from "./domains/sect-competition/operations.js";
import { sectRealmsOperationDefinitions } from "./domains/sect-realms/operations.js";
import { sectsOperationDefinitions } from "./domains/sects/operations.js";
import { socialOperationDefinitions } from "./domains/social/operations.js";
import { statusOperationDefinitions } from "./domains/status/operations.js";
import { teamsOperationDefinitions } from "./domains/teams/operations.js";

//#region src/api/registry.ts
const securitySchemes = {
	RobotBearer: {
		type: "http",
		scheme: "bearer",
		bearerFormat: "opaque",
		description: "机器人授权 token；由部署环境的 ROBOT_AUTH_TOKEN 提供"
	},
	RobotBid: {
		type: "apiKey",
		in: "header",
		name: "X-Bid"
	},
	UserBearer: {
		type: "http",
		scheme: "bearer",
		bearerFormat: "JWT",
		description: "角色 UID 绑定的短期普通用户访问令牌"
	},
	WorkerToken: {
		type: "apiKey",
		in: "header",
		name: "X-Worker-Token"
	}
};
const operationDefinitions = {
	...accountOperationDefinitions,
	...authOperationDefinitions,
	...battleOperationDefinitions,
	...benefitsOperationDefinitions,
	...communityOperationDefinitions,
	...crossPlatformOperationDefinitions,
	...cultivationOperationDefinitions,
	...dungeonsOperationDefinitions,
	...equipmentOperationDefinitions,
	...housingOperationDefinitions,
	...internalOperationDefinitions,
	...inventoryOperationDefinitions,
	...mailOperationDefinitions,
	...marketOperationDefinitions,
	...mentorshipOperationDefinitions,
	...notificationsOperationDefinitions,
	...partnersOperationDefinitions,
	...paymentsOperationDefinitions,
	...playersOperationDefinitions,
	...professionsOperationDefinitions,
	...rankingsOperationDefinitions,
	...rewardsOperationDefinitions,
	...sectCompetitionOperationDefinitions,
	...sectRealmsOperationDefinitions,
	...sectsOperationDefinitions,
	...socialOperationDefinitions,
	...statusOperationDefinitions,
	...teamsOperationDefinitions
};

//#endregion
export { operationDefinitions, securitySchemes };