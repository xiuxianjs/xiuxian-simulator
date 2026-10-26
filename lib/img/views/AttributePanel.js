import { PanelCard, PanelFailure, PanelFooterBar, PanelHeroHeader, PanelShell, buildTokens } from "./_panelShared.js";
import classNames from "classnames";
import * as React from "react";

//#region src/img/views/AttributePanel.tsx
function AttributeSectionTitle({ title, maxAttributeBonus = 0, themeTokens }) {
	const T = themeTokens;
	return /* @__PURE__ */ React.createElement("div", {
		className: classNames("flex items-center gap-2 px-[14px] py-[7px]"),
		style: {
			background: T.sectionBg,
			borderBottom: `1px solid ${T.borderCool}`
		}
	}, /* @__PURE__ */ React.createElement("div", {
		className: classNames("shrink-0 rounded-[3px_1px_4px_2px]"),
		style: {
			width: "4px",
			height: "18px",
			background: `linear-gradient(180deg, ${T.cinnabar} 0%, rgba(180,60,20,0.4) 100%)`
		}
	}), /* @__PURE__ */ React.createElement("span", {
		className: classNames("text-[18px] font-bold tracking-[2px]"),
		style: { color: T.inkDark }
	}, title), maxAttributeBonus ? /* @__PURE__ */ React.createElement("span", {
		className: classNames("rounded-[4px] px-[7px] py-[1px] text-[18px]"),
		style: {
			color: T.amber,
			background: "rgba(140,100,20,0.12)",
			border: "1px solid rgba(140,100,20,0.35)"
		}
	}, "MAX +", maxAttributeBonus, "%") : null);
}
function AttrRow({ label, value, max, color, themeTokens }) {
	const T = themeTokens;
	const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0;
	return /* @__PURE__ */ React.createElement("div", {
		className: classNames("flex items-center gap-[10px] px-[14px] py-[6px]"),
		style: { borderBottom: `1px solid ${T.divider}` }
	}, /* @__PURE__ */ React.createElement("span", {
		className: classNames("w-12 shrink-0 text-[16px]"),
		style: { color: T.inkMid }
	}, label), /* @__PURE__ */ React.createElement("div", {
		className: classNames("h-[6px] flex-1 overflow-hidden rounded-[4px_2px_3px_5px]"),
		style: { background: T.warmTagBg }
	}, /* @__PURE__ */ React.createElement("div", { style: {
		width: `${pct}%`,
		height: "100%",
		background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
		borderRadius: "4px 1px 3px 2px"
	} })), /* @__PURE__ */ React.createElement("span", {
		className: classNames("w-[90px] shrink-0 text-right text-[16px]"),
		style: {
			color: T.inkMid,
			fontFamily: "tttgbnumber, monospace"
		}
	}, value, /* @__PURE__ */ React.createElement("span", { style: { color: T.inkLight } }, "/", max)));
}
function CombatRow({ l1, v1, l2, v2, suffix = "", c1, c2, themeTokens }) {
	const T = themeTokens;
	const valColor1 = c1 ?? T.cinnabar;
	const valColor2 = c2 ?? T.cinnabar;
	return /* @__PURE__ */ React.createElement("div", {
		className: classNames("flex items-center"),
		style: { borderBottom: `1px solid ${T.divider}` }
	}, /* @__PURE__ */ React.createElement("div", { className: classNames("flex flex-1 items-center justify-between px-[14px] py-[7px]") }, /* @__PURE__ */ React.createElement("span", {
		className: classNames("text-[16px]"),
		style: { color: T.inkMid }
	}, l1), /* @__PURE__ */ React.createElement("span", {
		className: classNames("text-[18px] font-bold"),
		style: {
			color: valColor1,
			fontFamily: "tttgbnumber, monospace"
		}
	}, v1, suffix)), l2 !== void 0 && v2 !== void 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: {
		width: "1px",
		height: "28px",
		background: T.divider
	} }), /* @__PURE__ */ React.createElement("div", { className: classNames("flex flex-1 items-center justify-between px-[14px] py-[7px]") }, /* @__PURE__ */ React.createElement("span", {
		className: classNames("text-[16px]"),
		style: { color: T.inkMid }
	}, l2), /* @__PURE__ */ React.createElement("span", {
		className: classNames("text-[18px] font-bold"),
		style: {
			color: valColor2,
			fontFamily: "tttgbnumber, monospace"
		}
	}, v2, suffix))));
}
function AttributePanel({ data }) {
	if (!data) return /* @__PURE__ */ React.createElement(PanelFailure, null);
	const d = data;
	const themeTokens = buildTokens(d.theme);
	const T = themeTokens;
	return /* @__PURE__ */ React.createElement(PanelShell, { theme: data.theme }, /* @__PURE__ */ React.createElement(PanelHeroHeader, {
		avatarURL: d.avatarURL,
		daoName: d.daoName,
		uid: d.uid,
		realmName: d.realmName,
		rightNode: /* @__PURE__ */ React.createElement("div", {
			className: classNames("flex shrink-0 flex-col items-center justify-center gap-[2px] rounded-[10px_4px_8px_6px] px-[14px] py-2"),
			style: {
				border: `2px solid ${T.cinnabar}`,
				background: "linear-gradient(160deg, rgba(200,45,20,0.15) 0%, rgba(160,30,10,0.06) 100%)",
				boxShadow: "0 0 0 1px rgba(180,60,30,0.15), inset 0 1px 0 rgba(255,200,180,0.15)"
			}
		}, /* @__PURE__ */ React.createElement("span", {
			className: classNames("text-[14px] tracking-[2px]"),
			style: { color: T.cinnabar }
		}, "战力"), /* @__PURE__ */ React.createElement("span", {
			className: classNames("text-[26px] font-bold leading-none"),
			style: {
				color: T.cinnabar,
				fontFamily: "tttgbnumber, monospace"
			}
		}, d.combatPower))
	}), /* @__PURE__ */ React.createElement(PanelCard, { margin: "12px 12px 0" }, /* @__PURE__ */ React.createElement(AttributeSectionTitle, {
		title: "自由属性",
		maxAttributeBonus: d.maxAttributeBonus,
		themeTokens
	}), /* @__PURE__ */ React.createElement("div", { className: classNames("flex flex-col") }, /* @__PURE__ */ React.createElement(AttrRow, {
		label: "力量",
		value: d.strength,
		max: d.maxStrength,
		color: T.cinnabar,
		themeTokens
	}), /* @__PURE__ */ React.createElement(AttrRow, {
		label: "智慧",
		value: d.intelligence,
		max: d.maxIntelligence,
		color: T.janglan,
		themeTokens
	}), /* @__PURE__ */ React.createElement(AttrRow, {
		label: "体质",
		value: d.constitution,
		max: d.maxConstitution,
		color: T.green,
		themeTokens
	}), /* @__PURE__ */ React.createElement(AttrRow, {
		label: "敏捷",
		value: d.agility,
		max: d.maxAgility,
		color: T.amber,
		themeTokens
	}), /* @__PURE__ */ React.createElement(AttrRow, {
		label: "气运",
		value: d.luck,
		max: d.maxLuck,
		color: T.yanbo,
		themeTokens
	}))), /* @__PURE__ */ React.createElement(PanelCard, {
		margin: "10px 12px 12px",
		radius: "5px 12px 4px 10px"
	}, /* @__PURE__ */ React.createElement(AttributeSectionTitle, {
		title: "战斗属性",
		themeTokens
	}), /* @__PURE__ */ React.createElement("div", { className: classNames("flex flex-col") }, /* @__PURE__ */ React.createElement(CombatRow, {
		l1: "物理攻击",
		v1: d.physicalAttack,
		l2: "物理防御",
		v2: d.physicalDefense,
		c1: T.cinnabar,
		c2: T.janglan,
		themeTokens
	}), /* @__PURE__ */ React.createElement(CombatRow, {
		l1: "法术攻击",
		v1: d.magicAttack,
		l2: "法术防御",
		v2: d.magicDefense,
		c1: "#6a5a8a",
		c2: T.janglan,
		themeTokens
	}), /* @__PURE__ */ React.createElement(CombatRow, {
		l1: "生命上限",
		v1: d.hp,
		l2: "灵力上限",
		v2: d.spiritualPower,
		c1: T.cinnabar,
		c2: T.cyan,
		themeTokens
	}), /* @__PURE__ */ React.createElement(CombatRow, {
		l1: "速度",
		v1: d.speed,
		l2: "念力上限",
		v2: d.mentalPower,
		c1: T.amber,
		c2: T.green,
		themeTokens
	}), /* @__PURE__ */ React.createElement(CombatRow, {
		l1: "暴击率",
		v1: d.critRate,
		l2: "暴击伤害",
		v2: d.critDamage,
		suffix: "%",
		c1: "#b87030",
		c2: "#b87030",
		themeTokens
	}), /* @__PURE__ */ React.createElement(CombatRow, {
		l1: "抗暴率",
		v1: d.antiCritRate,
		l2: "命中率",
		v2: d.hitRate,
		suffix: "%",
		c1: T.janglan,
		c2: T.janglan,
		themeTokens
	}), d.mpRecoveryEfficiency !== void 0 && d.mentalRecoveryEfficiency !== void 0 && /* @__PURE__ */ React.createElement(CombatRow, {
		l1: "回灵效率",
		v1: d.mpRecoveryEfficiency,
		l2: "回念效率",
		v2: d.mentalRecoveryEfficiency,
		suffix: "%",
		c1: T.cyan,
		c2: T.green,
		themeTokens
	}), /* @__PURE__ */ React.createElement(CombatRow, {
		l1: "闪避率",
		v1: d.dodgeRate,
		suffix: "%",
		c1: T.janglan,
		themeTokens
	}))), /* @__PURE__ */ React.createElement(PanelFooterBar, { text: "/属性面板 刷新 · /我的装备 查看装备" }));
}

//#endregion
export { AttributePanel as default };