import { formatGameTime } from "../../utils/gameTime.js";
import { parseBackendEnemies } from "../../api/bot/queries.js";
import { FormatGui, createQuoteMarkdown } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/enemy/res.ts
/**
* 仇人列表
* 指令：/仇人
*
* 展示最近7天打劫过自己的玩家列表，支持一键回击/打劫
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const sendFailure = async (text) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "仇人",
			content: Format.createMarkdown().addText(text),
			footer: [{
				label: "打劫记录",
				command: "/打劫记录"
			}]
		}));
	};
	let result;
	try {
		result = await runRobotBusiness(e, "pvp.enemies", {}, parseBackendEnemies, next, async (reply) => {
			await sendFailure(reply.text);
		});
	} catch {
		await sendFailure("获取仇人列表失败，请稍后再试");
		return;
	}
	if (result.handled) return;
	const enemies = result.data;
	const md = Format.createMarkdown();
	if (enemies.length === 0) {
		md.addText("最近7天无人打劫你，天下太平。");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "仇人",
			content: md,
			footer: [{
				label: "打劫记录",
				command: "/打劫记录"
			}]
		}));
		return;
	}
	for (let i = 0; i < enemies.length; i++) {
		const enemy = enemies[i];
		const timeAgo = formatGameTime(enemy.lastAttackTime);
		const lines = [`【${i + 1}】${enemy.name}`, `${enemy.reports ? "普通被打" : "打劫"}${enemy.totalAttacks}次 最近${timeAgo}`];
		const actions = [{
			label: "打劫",
			command: `/打劫 ${enemy.uid}`
		}];
		if (enemy.reports) for (const report of enemy.reports) {
			lines.push(`#${report.id} ${report.counterStatusText ?? ""}`);
			if (report.counterDeadline && report.canCounterAttack) lines.push(`截止：${formatGameTime(report.counterDeadline)}`);
			if (report.canCounterAttack) actions.push({
				label: `免费反击 #${report.id}`,
				command: `/回击 ${report.id}`
			});
		}
		else actions.unshift({
			label: "回击",
			command: `/回击 ${enemy.lastLogId}`
		});
		md.addBlockquote(createQuoteMarkdown(lines, actions));
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: `近7日共 ${enemies.length} 位仇人`,
		content: md,
		footer: [{
			label: "打劫记录",
			command: "/打劫记录"
		}]
	}));
});

//#endregion
export { res_default as default };