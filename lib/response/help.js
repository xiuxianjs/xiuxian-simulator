import { buildBubble } from "./presentation/bubble.js";
import { errorBubble } from "./presentation/presets.js";
import "./presentation/index.js";
import { useMessage as useMessage$1 } from "../utils/useMessage.js";
import { selects } from "./config.js";
import { runRobotBusiness } from "./robotBusiness.js";
import { helpRealmName, helpRealmStage, realmHelpBubble } from "./help-realm.js";
import { helpNextStep, helpTopic, parsePersonalHelp, personalHelpBubble } from "./help-personal.js";
import { onResponse, useEvent } from "alemonjs";

//#region src/response/help.ts
var help_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const context = {
		isPrivate: e.isPrivate ?? false,
		bid: e.UserId
	};
	const argument = e.MessageText.trim().match(/(?:修仙)?帮助(?:\s+(.*))?$/u)?.[1]?.trim() ?? "";
	const realm = helpRealmName(argument);
	const topic = /^\d+$/.test(argument) ? "overview" : helpTopic(argument);
	let access;
	try {
		const result = await runRobotBusiness(e, "navigation.help", { topic: realm || topic === "unknown" ? "overview" : topic }, parsePersonalHelp, next);
		if (result.handled) return;
		access = result.data;
	} catch {
		await message.send(errorBubble({
			...context,
			title: "修仙帮助",
			reason: "帮助暂时无法打开，请稍后再试。"
		}));
		return;
	}
	if (realm) {
		const progress = access.progress;
		const actualRealm = progress && helpRealmName(progress.realm);
		const ownRealm = actualRealm && (realm === actualRealm || realm === helpRealmStage(actualRealm));
		await message.send(realmHelpBubble(context, ownRealm ? actualRealm : realm, ownRealm && progress ? helpNextStep(progress) : void 0));
		return;
	}
	await message.send(access.registered ? personalHelpBubble(context, topic, access.progress) : buildBubble({
		...context,
		title: "修仙帮助",
		bar: false,
		sections: [{
			title: "开始修仙",
			lines: ["说明：踏入仙途后，即可查看自己的进度和下一步。"]
		}],
		footer: [{
			label: "踏入仙途",
			command: "/踏入仙途"
		}]
	}));
});

//#endregion
export { help_default as default };