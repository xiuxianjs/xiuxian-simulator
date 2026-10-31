import { formatDamage } from "../../utils/formatHelper.js";
import { FormatGui } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { parseBackendScarecrow } from "../../api/bot/scarecrow.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { BattleFormatGui } from "../../utils/battleMemoryMessage.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/scarecrow/res.ts
/**
* 稻草人伤害测试
* 指令：挑战稻草人 [回合数]
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const messageText = e.MessageText || "";
	const match = messageText.match(/^(?:!|！|\/|#|＃)?挑战稻草人(?:\s+(\d+))?$/);
	const roundsText = match ? match[1] ?? null : messageText.replace(/^(?:!|！|\/|#|＃)?挑战稻草人/, "").trim() || null;
	const [, next] = useEvent();
	const sendFailure = async (text) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(text)
		}));
	};
	let result;
	try {
		result = await runRobotBusiness(e, "scarecrow.challenge", { roundsText }, parseBackendScarecrow, next, async (reply) => {
			await sendFailure(reply.text);
		});
	} catch (error) {
		await sendFailure(error instanceof Error ? error.message : "稻草人测试失败");
		return;
	}
	if (result.handled) return;
	const { summary, logId, rounds, target } = result.data;
	const md = Format.createMarkdown();
	md.addBold("稻草人伤害测试");
	md.addNewline();
	md.addText(`测试回合：${rounds} | 总伤害：${formatDamage(summary.totalDamage)}`);
	md.addNewline();
	md.addNewline();
	if (target) {
		md.addText(`标准靶：${target.realmName}｜生命 ${formatDamage(target.hp)}`);
		md.addNewline();
		md.addText(`物防 ${formatDamage(target.physicalDefense)}｜法防 ${formatDamage(target.magicDefense)}`);
		md.addNewline();
		md.addText("靶子不行动、不死亡；百分比伤害按上述生命基准计算。");
		md.addNewline();
		md.addNewline();
	}
	md.addBold("技能统计");
	md.addNewline();
	for (const skill of summary.skills) {
		md.addText(`${skill.skillName}：${skill.count}次 / ${formatDamage(skill.totalDamage)}伤害 (${skill.damageShareText}%)`);
		md.addNewline();
	}
	if (summary.buffDamage > 0) {
		md.addNewline();
		md.addBold(`Buff伤害：${formatDamage(summary.buffDamage)}`);
		md.addNewline();
		md.addText(`持续伤害(DOT)：${formatDamage(summary.buffDamage)}伤害 (${summary.buffDamageShareText}%)`);
		md.addNewline();
	}
	md.addNewline();
	md.addBold("暴击统计");
	md.addNewline();
	md.addText(`暴击次数：${summary.critCount} / 攻击${summary.totalSkillAttacks}次 / 暴击率：${summary.critRateText}%`);
	md.addNewline();
	if (summary.maxSingleDamage > 0) md.addText(`最大单次伤害：${formatDamage(summary.maxSingleDamage)}（回合${summary.maxSingleDamageRound} ${summary.maxSingleDamageSkill}）`);
	message.send(await BattleFormatGui({
		isPrivate,
		bid,
		title: "",
		content: md,
		footer: [{
			label: "文字记录",
			command: `/查看战斗过程 ${logId}`
		}, {
			label: "再次挑战",
			command: "/挑战稻草人"
		}]
	}, [{ id: logId }]));
});

//#endregion
export { res_default as default };