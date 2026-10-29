import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, sendMiddlewareReply } from "../../middlewareReply.js";
import { EMPTY_STRING, FIRST_ARG_INDEX, SECOND_ARG_INDEX } from "../../../constants/common.js";
import { SKILL_TYPE_MAP } from "../../../constants/skillBook.js";
import "../../../constants/index.js";
import { parseSkillBookSwitchOptions } from "../../../api/bot/skill-book-switch-options.js";
import { parseSkillBookSwitchResponse } from "../../../api/bot/skill-book-switch.js";
import { skillSwitchRecoveryTips } from "../../skillSwitchRecovery.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/skillBook/switch/res.ts
/**
* 展示已学习的对应类型技能列表，供玩家点击选择切换（纯渲染）
*/
const renderSkillSelectionList = (message, isPrivate, bid, _uid, typeSkillBooks, skillTypeName) => {
	const contentMd = Format.createMarkdown();
	const inUse = typeSkillBooks.filter((sb) => sb.isInUse);
	const notInUse = typeSkillBooks.filter((sb) => sb.canSwitch);
	const unavailable = typeSkillBooks.filter((sb) => !sb.isInUse && !sb.canSwitch);
	if (inUse.length > 0) {
		contentMd.addText("【使用中】");
		contentMd.addNewline();
		for (const sb of inUse) {
			contentMd.addText(`⚡【${sb.name}】（ID：${sb.id}）`);
			contentMd.addNewline();
		}
		contentMd.addNewline();
	}
	if (notInUse.length > 0) {
		contentMd.addText("【可切换】");
		contentMd.addNewline();
		for (const sb of notInUse) {
			contentMd.addText(`${sb.name}（ID：${sb.id}）`);
			addOptions(contentMd, [{
				label: "切换",
				command: `/切换${skillTypeName} ${sb.id}`
			}]);
		}
		contentMd.addNewline();
	}
	if (unavailable.length) {
		contentMd.addText("【当前不可切换】").addNewline();
		for (const book of unavailable) contentMd.addText(`${book.name}（ID：${book.id}）`).addNewline();
		contentMd.addText("当前未提供切换资格，请核对已学状态和类型。");
	}
	if (!notInUse.length) {
		contentMd.addText(typeSkillBooks.length ? "当前没有其他可切换功法，请核对已学列表与当前装备。" : "当前列表为空，请先核对对应类型的已学功法。");
		appendMiddlewareAdvice(contentMd, skillSwitchRecoveryTips(typeSkillBooks.length ? "当前没有其他可切换功法" : "当前列表为空"));
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: `切换${skillTypeName}`,
		header: [{
			label: "返回",
			command: "/我的功法"
		}],
		content: contentMd
	}));
};
/**
* 创建切换功法指令处理器
* @param skillTypeName 技能类型名称（战技、被动技、神通）
* 指令格式: /切换{类型} [功法ID]
* 不带ID时展示已学习的对应类型功法列表供选择
*/
const createSwitchHandler = (skillTypeName) => {
	return onResponse(selects, async (e) => {
		const [message] = useMessage$1();
		const bid = e?.UserId;
		const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
		const uid = e.uid;
		const commandPattern = new RegExp(`^(!|！|/|#|＃)?切换${skillTypeName}\\s*`, "g");
		const messageText = (e.MessageText || "").replace(commandPattern, "").trim();
		const args = messageText ? messageText.split(/\s+/) : [];
		const skillBookIdStr = args[0];
		const confirmArg = args[1];
		const [, parentNext] = useEvent();
		const renderFailure = adviceRenderer((reply) => sendMiddlewareReply(e, withBusinessRecovery("skill-books.switch", reply), true));
		if (args.length > 2 || confirmArg !== void 0 && confirmArg !== "确认") {
			await renderFailure({
				title: "",
				heading: "",
				text: "格式错误，切换确认只接受原功法编号及“确认”。",
				buttons: [],
				advice: []
			});
			return;
		}
		const response = await runRobotBusiness(e, "skill-books.switch", {
			skillType: skillTypeName,
			bookId: skillBookIdStr ?? null,
			confirm: confirmArg ?? null
		}, (value) => {
			if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("切换功法响应不完整");
			const row = value;
			if (row.skillType !== skillTypeName) throw new Error("切换功法类型错误");
			if (row.code === "SHOW_LIST") return {
				code: "SHOW_LIST",
				data: {
					typeSkillBooks: parseSkillBookSwitchOptions(row.options, skillTypeName),
					skillTypeName
				}
			};
			if (row.code !== "OK") throw new Error("切换功法响应不完整");
			const result = parseSkillBookSwitchResponse(row.result);
			if (result.outcome === "confirmation_required") return {
				code: "NEED_CONFIRM",
				data: {
					actualSkillBookId: result.skillBook.id,
					message: result.confirmationMessage
				}
			};
			return {
				code: "OK",
				data: { result: {
					success: true,
					skillBook: result.skillBook,
					oldSkillBook: result.oldSkillBook
				} }
			};
		}, parentNext, renderFailure).catch(async () => {
			await renderFailure({
				title: "",
				heading: "",
				text: "功法切换结果未获完整确认，请先核对当前功法、原比较与回执。",
				buttons: [],
				advice: []
			});
			return { handled: true };
		});
		if (response.handled) return;
		const result = response.data;
		switch (result.code) {
			case "SHOW_LIST":
				renderSkillSelectionList(message, isPrivate, bid, uid, result.data.typeSkillBooks, result.data.skillTypeName);
				return;
			case "NEED_CONFIRM": {
				const md = Format.createMarkdown();
				md.addText(`⚠️ ${result.data.message}`);
				md.addNewline().addText("尚未切换");
				md.addNewline();
				message.send(FormatGui({
					isPrivate,
					bid,
					title: "",
					content: md,
					footer: [{
						label: "确认切换",
						command: `/切换${skillTypeName} ${result.data.actualSkillBookId} 确认`
					}, {
						label: "返回我的功法",
						command: "/我的功法"
					}]
				}));
				return;
			}
			case "OK": {
				const { result: switchResult } = result.data;
				let successMessage = `✅ 切换成功\n\n【${switchResult.skillBook?.name}】\n类型: ${switchResult.skillBook?.skillType}`;
				if (switchResult.oldSkillBook) successMessage += `\n\n已将【${switchResult.oldSkillBook.name}】切换为已学习状态`;
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
			}
		}
	});
};
const switchBattleSkill = createSwitchHandler(SKILL_TYPE_MAP["战技"]);
const switchPassiveSkill = createSwitchHandler(SKILL_TYPE_MAP["被动技"]);
const switchMysticSkill = createSwitchHandler(SKILL_TYPE_MAP["神通"]);

//#endregion
export { switchBattleSkill as default, switchBattleSkill, switchMysticSkill, switchPassiveSkill };