import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { sendMiddlewareReply } from "../../middlewareReply.js";
import { SKILL_TYPE_MAP } from "../../../constants/skillBook.js";
import "../../../constants/index.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendSkillBookUnequip } from "../../../api/bot/skill-book-unequip.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/skillBook/unequip/res.ts
/** 创建换下功法指令处理器（战技、被动技、神通）。 */
const createUnequipHandler = (skillTypeName) => {
	return onResponse(selects, async (e) => {
		const [message] = useMessage$1();
		const bid = e?.UserId;
		const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
		const [, parentNext] = useEvent();
		const failure = adviceRenderer((reply) => sendMiddlewareReply(e, withBusinessRecovery("skill-books.unequip", reply), "footer"));
		if ((e.MessageText ?? "").replace(new RegExp(`^[!！/#＃]?换下${skillTypeName}\\s*`), "").trim()) {
			await failure({
				title: "",
				heading: "",
				text: `参数错误：/换下${skillTypeName} 不接编号、确认文字或其他参数，请先核对当前功法。`,
				buttons: [],
				advice: []
			});
			return;
		}
		const response = await runRobotBusiness(e, "skill-books.unequip", { skillType: skillTypeName }, (value) => {
			const data = parseBackendSkillBookUnequip(value);
			if (data.outcome !== "unequipped" || data.skillBook?.skillType !== null && data.skillBook?.skillType !== skillTypeName) throw new Error("换下功法响应不完整");
			return data;
		}, parentNext, failure).catch(async () => {
			await failure({
				title: "",
				heading: "",
				text: `换下${skillTypeName}结果未获完整确认，请先核对当前装备与原回执。`,
				buttons: [],
				advice: []
			});
			return { handled: true };
		});
		if (response.handled) return;
		const unequipResult = { skillBook: {
			name: response.data.skillBook?.name ?? "未知功法",
			skillType: response.data.skillBook?.skillType ?? skillTypeName
		} };
		const successMessage = [
			"✅ 换下成功",
			"",
			`【${unequipResult.skillBook.name}】`,
			`类型: ${unequipResult.skillBook.skillType}`
		].join("\n");
		const md = Format.createMarkdown();
		md.addText(successMessage);
		md.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: [{
				label: "查看我的功法",
				command: "/我的功法"
			}]
		}));
	});
};
const unequipBattleSkill = createUnequipHandler(SKILL_TYPE_MAP["战技"]);
const unequipPassiveSkill = createUnequipHandler(SKILL_TYPE_MAP["被动技"]);
const unequipMysticSkill = createUnequipHandler(SKILL_TYPE_MAP["神通"]);

//#endregion
export { unequipBattleSkill as default, unequipBattleSkill, unequipMysticSkill, unequipPassiveSkill };