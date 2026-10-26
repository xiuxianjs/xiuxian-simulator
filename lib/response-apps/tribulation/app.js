import { getCommandErrorMessage } from "../../utils/commandError.js";
import { BackendAPIError } from "../../api/bot/client.js";
import { formatGameTime } from "../../utils/gameTime.js";
import { participationRewardLines } from "../../api/schemas/public-tribulation.js";
import { isTribulationGrade, parseTribulationPreparation } from "../../api/schemas/tribulation.js";
import { getBackendRealmOverview } from "../../api/bot/realm-overview.js";
import { confirmBackendTribulationQuery } from "../../api/bot/tribulation-confirmation-query.js";
import { answerBackendTribulationHeartDemon, disruptBackendTribulation, evadeBackendTribulation, getBackendTribulationReceipt, openBackendTribulation, participateBackendTribulation, startBackendTribulation } from "../../api/bot/tribulation.js";

//#region src/response-apps/tribulation/app.ts
const grades = {
	low: "低威力",
	standard: "标准威力",
	high: "高威力"
};
const states = {
	ready: "已具备渡劫资格，尚未开启",
	opened: "渡劫已开启 · 准备中",
	evaded: "本次已主动暂避",
	scheduled: "尚未开放",
	preparing: "准备中",
	charging: "已确认，等待落雷",
	succeeded: "本次成功",
	failed: "本次失败",
	expired: "确认已超时",
	cancelled: "已取消"
};
const points = (value) => new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 3 }).format(value);
const time = (value) => value ? formatGameTime(value) : "尚未安排";
const back = {
	label: "我的境界",
	command: "/我的境界"
};
function tribulationPreparationPanel(overview) {
	if (!overview.tribulationPreparation) return {
		title: "我的劫云",
		sections: [{
			lines: ["暂无可用劫云"],
			buttons: [
				back,
				{
					label: "刷新劫云",
					command: "/我的渡劫"
				},
				{
					label: "劫云榜",
					command: "/劫云榜"
				}
			]
		}]
	};
	const p = parseTribulationPreparation(overview.tribulationPreparation);
	if (p.status === "ready") return {
		title: "我的劫云",
		sections: [{
			lines: [`${p.targetRealm} · ${p.canOpen ? "渡劫资格已达成 · 尚未开启" : "尚未满足开启条件"}`],
			buttons: p.canOpen ? [{
				label: "开启渡劫",
				command: `/开启渡劫 ${p.eventId}`
			}] : []
		}],
		footer: [{
			label: "刷新状态",
			command: "/我的渡劫"
		}, back]
	};
	const lines = [
		`${p.targetRealm} · ${states[p.status]}`,
		p.qualityProgress ? `累计成功：${p.qualityProgress.successful}/${p.requiredAttempts}` : `晋级需${p.requiredAttempts}次渡劫成功`,
		...p.status === "charging" && p.strikeAt ? [`落雷：${time(p.strikeAt)}`] : ["opened", "scheduled"].includes(p.status) && p.opensAt ? [`开启：${time(p.opensAt)}`] : [],
		...p.status === "preparing" && p.deadline ? [`确认截止：${time(p.deadline)}`] : []
	];
	if (p.status === "opened") lines.push("准备时间不限；确认开始后消耗材料，30分钟后落雷。");
	if (p.qualityProgress) lines.push(`平均品质：双攻击 +${points(p.qualityProgress.attackBonusPercent)}点 · ${p.qualityProgress.completed ? "已生效" : "晋级后生效"}`);
	if (!p.canStart && ["opened"].includes(p.status)) lines.push(p.gradeOptions?.length ? "尚未满足开劫条件" : "评级开劫暂未开放");
	if (p.qualityProgress?.completed) lines.push("本境界渡劫已完成 · 品质已生效");
	else if ([
		"succeeded",
		"failed",
		"expired",
		"cancelled",
		"evaded"
	].includes(p.status)) lines.push(...p.recoveryEndsAt && p.earliestRetryAt ? [
		...p.retryAt ? [`重试冷却结束：${time(p.retryAt)}`] : [],
		`失败恢复结束：${time(p.recoveryEndsAt)}`,
		`最早开启：${time(p.earliestRetryAt)}`
	] : p.retryAt ? [`再次开启最早：${time(p.retryAt)}`] : [], "届时仍需满足修为、恢复与境界资格。");
	const buttons = [];
	if ([
		"charging",
		"succeeded",
		"failed",
		"cancelled"
	].includes(p.status)) buttons.push({
		label: p.status === "charging" ? "查看落雷状态" : p.status === "cancelled" ? "查看取消与返还" : "本次结算",
		command: `/渡劫结算 ${p.eventId}`
	});
	if (!p.canStart && ["opened"].includes(p.status)) buttons.push({
		label: "核对开劫条件",
		command: "/我的境界"
	});
	const sections = [{
		lines,
		buttons
	}];
	if (p.status === "opened" && p.materials?.length) sections.push({ lines: ["开劫材料", ...p.materials.map((m) => `${m.itemName}：${m.currentQuantity}/${m.requiredQuantity}${m.sufficient ? "" : "（不足）"}`)] });
	if (p.canStart) for (const grade of p.gradeOptions ?? []) sections.push({
		lines: [`${grades[grade.grade]} · 雷劫双攻击 ×${grade.attackMultiplier}`, `品质 +${points(grade.attackBonusPercent)}点`],
		buttons: [{
			label: "选择",
			command: `/渡劫评级 ${p.eventId} ${grade.grade}`
		}]
	});
	if (p.heartDemon) sections.push({
		lines: [
			`心魔 · ${p.heartDemon.title}`,
			p.heartDemon.prompt,
			p.heartDemon.choice ? `已选择：${p.heartDemon.options.find((o) => o.id === p.heartDemon?.choice)?.name}` : "未回答 · 中性效果"
		],
		buttons: p.canAnswerHeartDemon ? p.heartDemon.options.map((o) => ({
			label: o.name,
			command: `/心魔选择 ${p.eventId} ${o.id}`
		})) : []
	});
	const evasionLines = [];
	if (p.evasion && (p.evasion.level > 0 || p.evasion.npcAttackBonusPercent > 0)) evasionLines.push(`暂避${p.evasion.level}档 · 雷劫双攻击 +${points(p.evasion.npcAttackBonusPercent)}%${p.evasion.recoversAt ? ` · 恢复：${time(p.evasion.recoversAt)}` : ""}`);
	if (p.canEvade && p.evasionPreview) evasionLines.push(`主动暂避后：${p.evasionPreview.nextLevel}档 · 雷劫双攻击 +${points(p.evasionPreview.nextAttackBonusPercent)}%；最后一次暂避后${p.evasionPreview.resetAfterSeconds}秒恢复。`, "不耗材料，成功进度保留；暂避后6小时可再次获得开启资格，届时仍需满足资格。");
	if (evasionLines.length) sections.push({
		lines: evasionLines,
		buttons: p.canEvade && p.evasionPreview ? [{
			label: "主动暂避",
			command: `/暂避渡劫 ${p.eventId}`
		}] : []
	});
	return {
		title: "我的劫云",
		sections,
		footer: [
			{
				label: "刷新劫云",
				command: "/我的渡劫"
			},
			{
				label: "劫云榜",
				command: "/劫云榜"
			},
			back
		]
	};
}
function tribulationHeartDemonPanel(eventId, h, choice) {
	const o = h.options.find((option) => option.id === choice);
	if (!o) throw new Error("心魔选项无效");
	return {
		title: `确认心魔回答 · ${o.name}`,
		sections: [{
			lines: [
				`心魔 · ${h.title}`,
				h.prompt,
				`本场玩家双攻击 ×${String(o.attackMultiplier)}，双防御 ×${String(o.defenseMultiplier)}`,
				"本场回答不可更改 · 各层沿用",
				"接纳或不回答：中性效果"
			],
			buttons: [{
				label: `确认${o.name}`,
				command: `/心魔回答 ${eventId} ${choice} ${commandVersion(h.policyVersion)}`
			}, {
				label: "返回选项",
				command: "/我的渡劫"
			}]
		}]
	};
}
function tribulationStartCommand(c) {
	if (!Number.isSafeInteger(c.eventId) || c.eventId <= 0 || !isTribulationGrade(c.grade) || !Number.isFinite(c.attackMultiplier) || c.attackMultiplier <= 0 || !/^[a-f0-9]{64}$/.test(c.conditionVersion)) throw new Error("Invalid tribulation confirmation");
	const raw = Buffer.alloc(49);
	raw.writeBigUInt64BE(BigInt(c.eventId), 0);
	raw[8] = [
		"low",
		"standard",
		"high"
	].indexOf(c.grade);
	raw.writeDoubleBE(c.attackMultiplier, 9);
	Buffer.from(c.conditionVersion, "hex").copy(raw, 17);
	return `/渡劫开劫 s${raw.toString("base64url")}`;
}
function tribulationConfirmationPanel(c, materialNames = {}, detail = false) {
	const summary = [
		`${grades[c.grade]} · 雷劫双攻击 ×${c.attackMultiplier}`,
		`累计成功：${c.progress.successful}/${c.progress.requiredAttempts}`,
		`品质：${c.rewardScope === "current" ? "当前大境界" : "累计境界"} · 晋级后按成功评级均值生效`
	];
	const costs = [
		"开劫消耗与风险",
		...c.materials.map((m) => `${materialNames[m.itemId] ?? `材料 #${m.itemId}`} ×${m.quantity}`),
		`本次成功消耗修为：${c.successExperienceCost}`,
		`按当前修为预估，失败后剩余：${c.failureExperienceAfter}（当前${c.experienceBefore}）`,
		"失败按落雷时修为保留90%；等待期间新增修为也计入。",
		`连续${c.battle.layers.length}层 · 生命、灵力与复活次数不重置`,
		"确认开始即扣材料 · 30分钟后落雷 · 系统取消返还",
		"本次成功或失败后6小时可再次获得开启资格，届时仍需满足资格。"
	];
	const lines = [];
	if (c.heartDemon) {
		const o = c.heartDemon.options.find((option) => option.id === c.heartDemon?.choice);
		lines.push(`心魔：${o?.name ?? "未回答（中性）"} · 本场玩家双攻击 ×${String(o?.attackMultiplier ?? 1)}，双防御 ×${String(o?.defenseMultiplier ?? 1)}`);
	}
	if (c.evasion) lines.push(`暂避档位：${c.evasion.level} · 雷劫双攻击 +${points(c.evasion.npcAttackBonusPercent)}%（开劫锁定，品质奖励不变）`);
	if (c.karma) lines.push(`因果：当前煞气${c.karma.currentShaQi} · 雷劫双攻击 +${points(c.karma.shaQiAttackBonusPercent)}%`, `有效捣乱${c.karma.activeDisruptions}次 · 因果增幅 +${points(c.karma.disruptionAttackBonusPercent)}%`, `因果合计：雷劫双攻击 +${points(c.karma.npcAttackBonusPercent)}%（开劫锁定，不增加品质奖励）`);
	if (c.weather) {
		lines.push(`天气：${c.weather.name} · 影响雷劫`, `下次天气变化：${time(c.weather.changesAt)}`, "天气以落雷时为准");
		const names = {
			physicalAttackMultiplier: "物攻",
			magicAttackMultiplier: "法攻",
			physicalDefenseMultiplier: "物防",
			magicDefenseMultiplier: "法防",
			speedMultiplier: "速度",
			critRatePoints: "暴击率"
		};
		const effects = Object.entries(c.weather.npc).filter(([key, value]) => value !== (key === "critRatePoints" ? 0 : 1)).map(([key, value]) => key === "critRatePoints" ? `${names.critRatePoints} ${Number(value) >= 0 ? "+" : ""}${value}点` : `${names[key]} ×${value}`);
		if (effects.length) lines.push(effects.join(" · "));
	}
	if (c.attackLimit) lines.push(`雷劫双攻击上限：基础 ×${String(c.attackLimit.maxMultiplier)} · 品质奖励不变`);
	const previewCommand = `/渡劫评级 ${c.eventId} ${c.grade}`;
	const sections = [{
		lines: summary,
		buttons: [{
			label: detail ? "收起详情" : "雷劫详情",
			command: previewCommand + (detail ? "" : " 详情")
		}]
	}];
	if (lines.length) sections.push({ lines: ["天时与因果", ...lines] });
	if (detail) {
		const u = c.battle.player;
		sections.push({ lines: [
			"当前配装",
			`生命 ${u.HP} · 灵力 ${u.MP}`,
			`物攻 ${u.PhysicalAttack} · 法攻 ${u.MagicAttack}`,
			`物防 ${u.PhysicalDefense} · 法防 ${u.MagicDefense} · 速度 ${u.Speed}`
		] });
		for (const layer of c.battle.layers) sections.push({ lines: [`第${layer.layer}层`, ...layer.enemies.flatMap((n) => [
			`${n.Name} · 生命 ${n.HP}`,
			`物攻 ${n.PhysicalAttack} · 法攻 ${n.MagicAttack}`,
			`物防 ${n.PhysicalDefense} · 法防 ${n.MagicDefense} · 速度 ${n.Speed}`
		])] });
	}
	sections.push({
		lines: costs,
		buttons: [{
			label: "确认开劫",
			command: tribulationStartCommand(c)
		}, {
			label: "返回劫云",
			command: "/我的渡劫"
		}]
	});
	return {
		title: detail ? "雷劫详情" : "确认渡劫",
		sections
	};
}
function tribulationReceiptPanel(r) {
	if ("status" in r) return {
		title: r.status === "cancelled" ? "本次落雷已取消" : r.status === "charging" ? "等待落雷" : "结算回执待取回",
		sections: [{
			lines: [
				`${grades[r.grade]} · ${r.refunded ? "材料已返还" : "材料已扣除"}`,
				`落雷时间：${time(r.strikeAt)}`,
				...r.status === "cancelled" ? [r.cancelledReason ?? "系统取消", r.refunded ? "本次材料已返还。" : "材料返还尚未确认。"] : r.status === "charging" ? ["以落雷时的配装、技能与天气迎劫"] : [`本次${r.status === "succeeded" ? "成功" : "失败"}，详细回执待取回；请刷新本次状态。`]
			],
			buttons: [{
				label: "刷新本次状态",
				command: `/渡劫结算 ${r.eventId}`
			}, {
				label: "我的劫云",
				command: "/我的渡劫"
			}]
		}]
	};
	const lines = [
		`${grades[r.grade]} · 累计成功 ${r.progress.successful}/${r.progress.requiredAttempts}`,
		r.battle.summary,
		`本次通过：${r.battle.passedLayers}/${r.battle.totalLayers}层`,
		`双攻击品质加成 +${points(r.progress.attackBonusPercent)}个百分点${r.progress.completed ? "，已生效" : "，尚未生效"}。`
	];
	const conditions = [
		...r.conditions?.heartDemon ? [`本场心魔：${r.conditions.heartDemon.options.find((o) => o.id === r.conditions?.heartDemon?.choice)?.name ?? "未回答（中性）"}`] : [],
		...r.conditions?.evasion ? [`本场暂避：${r.conditions.evasion.level}档 · 雷劫双攻击 +${points(r.conditions.evasion.npcAttackBonusPercent)}%（开劫锁定）`] : [],
		...r.conditions?.karma ? [`本场因果：雷劫双攻击 +${points(r.conditions.karma.npcAttackBonusPercent)}%（开劫锁定）`] : [],
		...r.conditions?.disruption ? [`本场捣乱：${r.conditions.disruption.count}人 · 捣乱来源增幅 +${r.conditions.disruption.attackBonusPercent}%`] : [],
		...r.conditions?.attackLimit ? [`本场雷劫双攻击上限：基础 ×${String(r.conditions.attackLimit.maxMultiplier)}`] : [],
		...r.conditions?.weather ? [`本场固定天气：${r.conditions.weather.name}`] : []
	];
	if (r.success && !r.promoted) lines.push("成功进度已保存，尚未晋级。");
	if (!r.success) lines.push("已有成功进度保留 · 再次开劫需恢复并满足资格");
	if (r.debuff?.applied) lines.push(`晋级恢复截止：${time(r.debuff.expiresAt)}`);
	return {
		title: r.promoted ? "渡劫晋级成功" : r.success ? "本次渡劫成功" : "本次渡劫失败",
		sections: [
			{ lines },
			{ lines: [`修为：${r.experienceBefore} → ${r.experienceAfter}`, ...r.materials.map((m) => `已消耗：${m.itemName} ×${m.requiredQuantity}`)] },
			...conditions.length ? [{ lines: ["本场劫况", ...conditions] }] : []
		],
		footer: [
			{
				label: "我的劫云",
				command: "/我的渡劫"
			},
			{
				label: "本次结算",
				command: `/渡劫结算 ${r.eventId}`
			},
			back
		]
	};
}
function commandVersion(version) {
	return /^[a-f0-9]{64}$/.test(version) ? "v" + Buffer.from(version, "hex").toString("base64url") : version;
}
function parseCommandVersion(parts) {
	const encoded = parts.join("");
	if (encoded.startsWith("v")) {
		const payload = encoded.slice(1);
		if (!/^[A-Za-z0-9_-]{43}$/.test(payload)) return "";
		const bytes = Buffer.from(payload, "base64url");
		return bytes.length === 32 && bytes.toString("base64url") === payload ? bytes.toString("hex") : "";
	}
	return encoded.replace(/-/g, "");
}
function parseTribulationCommand(text) {
	const command = text.replace(/[\u200B-\u200F\u2060\uFEFF]/g, "").trim().replace(/^[!！/#＃]/, "");
	if (command === "我的渡劫") return { kind: "overview" };
	const args = command.split(/\s+/);
	if (args[0] === "渡劫开劫" && args.length === 2 && /^s[A-Za-z0-9_-]{66}$/.test(args[1])) {
		const raw = Buffer.from(args[1].slice(1), "base64url");
		if (raw.length !== 49 || raw.toString("base64url") !== args[1].slice(1)) return null;
		const eventId = Number(raw.readBigUInt64BE(0));
		const grade = [
			"low",
			"standard",
			"high"
		][raw[8]];
		const attackMultiplier = raw.readDoubleBE(9);
		if (!Number.isSafeInteger(eventId) || eventId <= 0 || !isTribulationGrade(grade) || !Number.isFinite(attackMultiplier) || attackMultiplier <= 0) return null;
		return {
			kind: "start",
			eventId,
			input: {
				grade,
				attackMultiplier,
				conditionVersion: raw.subarray(17).toString("hex")
			}
		};
	}
	const eventId = Number(args[1]);
	if (!/^\d+$/.test(args[1] ?? "") || !Number.isSafeInteger(eventId) || eventId <= 0) return null;
	if ([
		"guard",
		"slay",
		"accept"
	].includes(args[2])) {
		const choice = args[2];
		if (args[0] === "心魔选择" && args.length === 3) return {
			kind: "heartPreview",
			eventId,
			choice
		};
		if (args[0] === "心魔回答" && args.length >= 4 && /^[a-f0-9]{64}$/.test(parseCommandVersion(args.slice(3)))) return {
			kind: "heartAnswer",
			eventId,
			choice,
			policyVersion: parseCommandVersion(args.slice(3))
		};
	}
	if (args[0] === "开启渡劫" && args.length === 2) return {
		kind: "open",
		eventId
	};
	if (args[0] === "暂避渡劫" && args.length === 2) return {
		kind: "evade",
		eventId
	};
	if (args[0] === "参与观望" && args.length === 2) return {
		kind: "participate",
		eventId
	};
	if (args[0] === "捣乱渡劫" && args.length === 2) return {
		kind: "disrupt",
		eventId
	};
	if (args[0] === "渡劫结算" && args.length === 2) return {
		kind: "receipt",
		eventId
	};
	if (args[0] === "渡劫评级" && (args.length === 3 || args.length === 4 && args[3] === "详情") && isTribulationGrade(args[2])) return {
		kind: "confirm",
		eventId,
		grade: args[2]
	};
	const attackMultiplier = Number(args[3]);
	if (args[0] === "渡劫开劫" && args.length >= 5 && isTribulationGrade(args[2]) && Number.isFinite(attackMultiplier) && attackMultiplier > 0 && /^[a-f0-9]{64}$/.test(parseCommandVersion(args.slice(4)))) return {
		kind: "start",
		eventId,
		input: {
			grade: args[2],
			attackMultiplier,
			conditionVersion: parseCommandVersion(args.slice(4))
		}
	};
	return null;
}
const dependencies = {
	open: openBackendTribulation,
	answerHeartDemon: answerBackendTribulationHeartDemon,
	evade: evadeBackendTribulation,
	disrupt: disruptBackendTribulation,
	participate: participateBackendTribulation,
	overview: getBackendRealmOverview,
	confirm: confirmBackendTribulationQuery,
	receipt: getBackendTribulationReceipt,
	start: startBackendTribulation
};
async function runTribulationCommand(text, params, api = dependencies) {
	const command = parseTribulationCommand(text);
	if (!command) return {
		title: "渡劫指令无效",
		sections: [{
			lines: ["请选择当前劫云。"],
			buttons: [{
				label: "我的劫云",
				command: "/我的渡劫"
			}]
		}]
	};
	try {
		if (command.kind === "heartPreview") {
			const overview = await api.overview(params.bid, params.uid);
			const p = parseTribulationPreparation(overview.tribulationPreparation);
			if (p.eventId !== command.eventId || !p.canAnswerHeartDemon || !p.heartDemon) throw new Error("本次不在可回答的确认窗口");
			return tribulationHeartDemonPanel(command.eventId, p.heartDemon, command.choice);
		}
		if (command.kind === "heartAnswer") {
			const h = await api.answerHeartDemon(params.bid, params.uid, command.eventId, command.choice, command.policyVersion, params.request);
			const o = h.options.find((option) => option.id === h.choice);
			return {
				title: "本次心魔已固定",
				sections: [{
					lines: [`${o?.name ?? "已回答"} · 本场玩家双攻击 ×${String(o?.attackMultiplier ?? 1)}，双防御 ×${String(o?.defenseMultiplier ?? 1)}`],
					buttons: [{
						label: "我的劫云",
						command: "/我的渡劫"
					}]
				}]
			};
		}
		if (command.kind === "evade") {
			const r = await api.evade(params.bid, params.uid, command.eventId, params.request);
			return {
				title: "本次已主动暂避",
				sections: [{
					lines: [
						`本次暂避后档位：${r.levelAfter}`,
						`恢复：${time(r.recoversAt)}`,
						`再次开启最早：${time(r.retryAt)}`,
						"未扣除材料，累计成功进度保留。"
					],
					buttons: [{
						label: "我的劫云",
						command: "/我的渡劫"
					}]
				}]
			};
		}
		if (command.kind === "participate") {
			const r = await api.participate(params.bid, params.uid, command.eventId, params.request);
			return {
				title: "渡劫感悟 · 已参与观望",
				sections: [{
					lines: participationRewardLines(r.reward),
					buttons: [{
						label: "劫云榜",
						command: "/劫云榜"
					}]
				}]
			};
		}
		if (command.kind === "disrupt") {
			const result = await api.disrupt(params.bid, params.uid, command.eventId, params.request);
			return {
				title: "本场已捣乱",
				sections: [{
					lines: [
						"无物品或货币成本 · 本场限一次",
						...result.reward ? participationRewardLines(result.reward) : [],
						`累计${result.summary.count}人捣乱 · 捣乱来源增幅 +${result.summary.attackBonusPercent}%（来源上限10%）`,
						"劫主品质奖励不变"
					],
					buttons: [{
						label: "劫云榜",
						command: "/劫云榜"
					}]
				}]
			};
		}
		if (command.kind === "open") return tribulationPreparationPanel({ tribulationPreparation: await api.open(params.bid, params.uid, command.eventId, params.request) });
		if (command.kind === "overview") return tribulationPreparationPanel(await api.overview(params.bid, params.uid));
		if (command.kind === "confirm") {
			const confirmed = await api.confirm(params.bid, params.uid, command.eventId, command.grade, params.request);
			return tribulationConfirmationPanel(confirmed.confirmation, confirmed.materialNames, /\s详情\s*$/.test(text));
		}
		if (command.kind === "receipt") return tribulationReceiptPanel(await api.receipt(params.bid, params.uid, command.eventId));
		try {
			return tribulationReceiptPanel(await api.start(params.bid, params.uid, command.eventId, command.input, params.request));
		} catch (error) {
			try {
				return tribulationReceiptPanel(await api.receipt(params.bid, params.uid, command.eventId));
			} catch (readError) {
				const stale = error instanceof BackendAPIError && error.status === 409 && readError instanceof BackendAPIError && readError.status === 404;
				return {
					title: stale ? "渡劫条件已变化" : "渡劫结果待确认",
					sections: [{
						lines: [getCommandErrorMessage(error), stale ? "请重新选择评级。" : "结果尚未确认，不代表开劫未执行。"],
						buttons: [
							{
								label: "取回结算",
								command: `/渡劫结算 ${command.eventId}`
							},
							...stale ? [] : [{
								label: "按原确认重试",
								command: tribulationStartCommand({
									...command.input,
									eventId: command.eventId
								})
							}],
							{
								label: "我的劫云",
								command: "/我的渡劫"
							}
						]
					}]
				};
			}
		}
	} catch (error) {
		return {
			title: "渡劫操作未完成",
			sections: [{
				lines: [
					getCommandErrorMessage(error),
					...command.kind === "heartAnswer" ? ["回答结果待确认，请查看当前劫云。"] : [],
					...[
						"receipt",
						"evade",
						"participate",
						"disrupt"
					].includes(command.kind) ? ["操作或查询结果待确认，请先查看原事件状态；不会自动重新提交。"] : []
				],
				buttons: [
					...command.kind === "receipt" ? [{
						label: "刷新原事件",
						command: `/渡劫结算 ${command.eventId}`
					}] : [],
					...command.kind === "participate" || command.kind === "disrupt" ? [{
						label: "返回原劫云",
						command: `/观望渡劫 ${command.eventId}`
					}] : [],
					...command.kind === "evade" ? [{
						label: "查看原事件",
						command: `/观望渡劫 ${command.eventId}`
					}] : [],
					...command.kind === "confirm" ? [{
						label: "刷新原评级",
						command: `/渡劫评级 ${command.eventId} ${command.grade}`
					}] : [],
					...command.kind === "heartAnswer" ? [{
						label: "按原回答重试",
						command: `/心魔回答 ${command.eventId} ${command.choice} ${commandVersion(command.policyVersion)}`
					}] : [],
					{
						label: "我的劫云",
						command: "/我的渡劫"
					},
					back
				]
			}]
		};
	}
}

//#endregion
export { parseTribulationCommand, runTribulationCommand, tribulationConfirmationPanel, tribulationHeartDemonPanel, tribulationPreparationPanel, tribulationReceiptPanel, tribulationStartCommand };