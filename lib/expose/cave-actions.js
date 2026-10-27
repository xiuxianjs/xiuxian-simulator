import { requestBackend } from "../api/bot/client.js";
import { boolean, integer, list, number, object, text } from "./schema.js";
import { mutation } from "./mutation.js";
import { query } from "./query.js";
import { caveSchema } from "./common-queries.js";
import { parseBackendCaveCommand, parseBackendCavePlantQuery } from "../api/bot/cave-command.js";
import { parseRobotCaveAction, parseRobotCavePlant } from "../api/bot/cave-robot-command.js";
import { parseMasterAction } from "../api/bot/master-actions.js";

//#region src/expose/cave-actions.ts
const plotIndex = {
	type: "integer",
	minimum: 1,
	maximum: 2147483647
};
const options = object({
	plotIndex: integer,
	remainingPlots: integer,
	options: list(object({
		seedName: text,
		cropName: text,
		matureHours: number,
		quantity: integer
	}))
});
const commandResult = object({
	message: text,
	ownerUid: integer,
	snapshotError: text,
	needsSeedSelection: boolean,
	overview: caveSchema,
	options
}, [
	"ownerUid",
	"snapshotError",
	"overview",
	"options"
]);
const plotArgs = (input) => ({ plotIndex: input.plotIndex === void 0 ? null : String(input.plotIndex) });
const care = (operation, word, description) => mutation(description, operation, object({ plotIndex }, ["plotIndex"]), commandResult, (input) => `/${word}${input.plotIndex === void 0 ? "" : ` ${input.plotIndex}`}`, (data) => {
	const result = parseRobotCaveAction(data);
	if (result.mode !== "command") throw new Error("灵田操作未返回结算回执");
	return result.result;
}, plotArgs);
const caveActions = {
	get_cave_plant_options: query("查询本人灵田可播种灵种、库存、成熟时长及空闲地块；plotIndex 可选，不执行播种。", object({
		options,
		overview: caveSchema
	}), async ({ bid, uid, request }, input) => parseBackendCavePlantQuery(await requestBackend(bid, "get_players_id_cave_plant_query", {
		path: { id: uid },
		query: { plotIndex: input.plotIndex ?? 0 },
		...request
	})), object({ plotIndex }, ["plotIndex"])),
	cultivate_cave_plot: mutation("开垦指定灵田地块，消耗材料、资格由服务端校验。返回实际操作说明与最新快照；snapshotError 表示操作后快照读取失败，不能自动重做。", "cave.cultivate", object({ plotIndex }), commandResult, (input) => `/开垦 ${input.plotIndex}`, parseBackendCaveCommand, plotArgs),
	plant_cave_seed: mutation("在指定地块播种所选灵种，消耗库存；灵种名称取 get_cave_plant_options。成熟周期、产出和状态由服务端决定。", "cave.plant", object({
		plotIndex,
		seedName: {
			type: "string",
			minLength: 1
		}
	}), commandResult, (input) => `/播种 ${input.plotIndex} ${input.seedName}`, (data) => {
		const result = parseRobotCavePlant(data);
		if (result.mode !== "plant") throw new Error("播种未返回操作回执");
		return result.result;
	}, (input) => ({
		...plotArgs(input),
		seedName: input.seedName
	})),
	water_cave_plots: care("cave.water", "浇灌", "浇灌本人灵田；指定 plotIndex 操作一块，省略时按服务端批量规则处理全部地块。"),
	remove_cave_worms: care("cave.worm", "除虫", "对本人灵田除虫；指定 plotIndex 操作一块，省略时批量处理。"),
	remove_cave_weeds: care("cave.weed", "除草", "对本人灵田除草；指定 plotIndex 操作一块，省略时批量处理。"),
	harvest_cave_plots: care("cave.harvest", "收割", "收割本人已成熟灵田；指定 plotIndex 操作一块，省略时批量处理。以服务端实际收获回执为准。"),
	tend_cave_plots: mutation("一键打理本人灵田，依次照料并收割；可能部分完成，必须检查 message 中各步骤结果，不能将整个调用成功视为每项成功。", "cave.tend-all", object({}), object({ message: text }), () => "/一键打理灵田", parseMasterAction, () => ({ harvest: false }))
};

//#endregion
export { caveActions };