import { boolean, integer, list, object, text } from "./schema.js";
import { isRetiredCommand } from "../response/retiredFeatures.js";
import { observation } from "./mutation.js";
import { parseBackendTianshuContent } from "../api/bot/tianshu-content.js";
import { activeDesign } from "./active-design.js";
import { parseBackendNavigation } from "../api/bot/navigation.js";

//#region src/expose/tianshu-actions.ts
const unlock = object({
	realm: text,
	features: list(text),
	unlocked: boolean
}, ["unlocked"]);
const stage = object({
	stageLevel: integer,
	stageName: text,
	realmName: text,
	unlocks: list(unlock)
}, ["realmName"]);
const feature = object({
	id: text,
	name: text,
	description: text,
	realm: text,
	realmReached: boolean,
	visible: boolean,
	conditions: list(text),
	entryPaths: list(text),
	lockedReason: text,
	minimumLevel: integer,
	gate: object({
		kind: text,
		minimumLevel: integer,
		minimumStage: integer,
		minimumRealmId: integer,
		maximumStage: integer
	}, [
		"minimumStage",
		"minimumRealmId",
		"maximumStage"
	])
}, [
	"entryPaths",
	"lockedReason",
	"minimumLevel",
	"gate"
]);
const tianshuActions = {
	get_navigation: observation("查询当前账号注册状态和服务端可见导航指令；入口可见不代表满足操作的所有条件。未注册账号也可查询。", "navigation.help", object({}), object({
		registered: boolean,
		moreVisibleCommands: list(text),
		foldVisibleCommands: list(text)
	}), () => "/修仙帮助", (data) => {
		const navigation = parseBackendNavigation(data);
		return {
			...navigation,
			moreVisibleCommands: navigation.moreVisibleCommands.filter((command) => !isRetiredCommand(command)),
			foldVisibleCommands: navigation.foldVisibleCommands.filter((command) => !isRetiredCommand(command))
		};
	}),
	get_tianshu: observation("查询机器人当前支持玩法的天书规则、境界开放条件和当前角色的服务端功能状态；已下架玩法不在本目录中；未注册账号也可查询公共内容。visible 和 realmReached 不保证满足所有业务条件。", "tianshu.content", object({}), object({
		intro: text,
		realmUnlocks: list(object({
			realm: text,
			features: list(text)
		})),
		notes: list(text),
		gateVersion: integer,
		currentStage: stage,
		nextStage: stage,
		featureCatalog: list(object({
			stageLevel: integer,
			stageName: text,
			features: list(feature)
		})),
		commandFeatures: list(object({
			command: text,
			featureId: text
		}))
	}, [
		"gateVersion",
		"currentStage",
		"nextStage",
		"featureCatalog",
		"commandFeatures"
	]), () => "/天书", (data) => {
		const content = activeDesign(parseBackendTianshuContent(data));
		const commandFeatures = content.commandFeatures && Object.entries(content.commandFeatures).map(([command, featureId]) => ({
			command,
			featureId
		}));
		return {
			...content,
			...commandFeatures ? { commandFeatures } : {}
		};
	})
};

//#endregion
export { tianshuActions };