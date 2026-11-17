import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { parseProfessionRobotTools, professionToolSwitchInput } from "../../../api/bot/profession-robot-tools.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/profession/replaceEquip/res.ts
const switchFooter = (typeName) => {
	return /炼器|锻造/.test(typeName ?? "") ? [{
		label: "返回炼器",
		command: "/我的锻造"
	}] : [{
		label: "我的天工",
		command: "/炼丹 天工"
	}];
};
/**
* 替换职业工具指令
* 用于切换火焰、丹炉、炼器台等天工工具
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	try {
		const [, next] = useEvent();
		const response = await runRobotBusiness(e, "profession.replace-tool", professionToolSwitchInput(e.MessageText), parseProfessionRobotTools, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: reply.title,
				content: Format.createMarkdown().addText(reply.text)
			}));
		});
		if (response.handled) return;
		const result = response.data;
		if (result.code === "LIST") {
			const md = Format.createMarkdown();
			const { activeType, page, totalPages, types } = result.data;
			const groups = /* @__PURE__ */ new Map();
			for (const tool of result.data.tools) {
				const list = groups.get(tool.typeName) ?? [];
				list.push(tool);
				groups.set(tool.typeName, list);
			}
			if (result.data.tools.length === 0) {
				md.addText("当前没有可切换的天工工具");
				appendMiddlewareAdvice(md, [{
					command: "/储物袋 天工",
					description: "核对已装备、锁定状态、工具分类和装备条件，再选择当前可用工具"
				}]);
			} else {
				md.addText(result.data.tools.some((tool) => !tool.canReplace) ? "持有天工" : "可切换天工");
				md.addNewline();
				for (const [typeName, tools] of groups) {
					md.addText(`【${typeName}】`);
					md.addNewline();
					for (const tool of tools) {
						md.addText(`【${tool.id}】${tool.name}-${tool.grade}`);
						addOptions(md, [...tool.canReplace ? [{
							label: "切换",
							command: `/替换 ${tool.id}`
						}] : [], {
							label: "详情",
							command: `/物品详情 ${tool.name}`
						}]);
						md.addNewline();
						if (tool.forgeRequirement) {
							const { realm, level } = tool.forgeRequirement;
							md.addText(realm && level !== null ? `装备条件：${realm}、锻造 ${level} 级` : "装备条件：暂不可用");
							md.addNewline();
						}
					}
				}
			}
			const header = types.map((typeName) => ({
				label: typeName,
				selected: typeName === activeType,
				command: `/替换 列表 1 ${typeName}`,
				autoEnter: false
			}));
			const nav = page > 1 || totalPages > 1 ? {
				current: page,
				total: totalPages,
				command: `/替换 列表 {page}${activeType ? ` ${activeType}` : ""}`,
				autoEnter: false
			} : void 0;
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "切换天工",
				header,
				content: md,
				nav,
				footer: switchFooter(activeType)
			}));
			return;
		}
		if (result.code === "OK") {
			const md = Format.createMarkdown();
			md.addText(`✅ ${result.data.message}`);
			md.addNewline();
			if (result.data.equipment) {
				md.addText(`装备名称：${result.data.equipment.name}`);
				md.addNewline();
				md.addText(`品级：${result.data.equipment.gradeName}`);
				md.addNewline();
				md.addText(`类型：${result.data.equipment.typeName}`);
				md.addNewline();
			}
			md.addNewline();
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "切换天工",
				content: md,
				footer: switchFooter(result.data.equipment?.typeName)
			}));
		} else {
			const md = Format.createMarkdown();
			md.addText("替换职业工具失败，请稍后重试");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
		}
	} catch (error) {
		logger.error("替换职业工具失败:", error);
		const md = Format.createMarkdown();
		md.addText("替换职业工具失败，请稍后重试");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };