import { measureTransportStage } from "../utils/transportTiming.js";
import { useMessage as useMessage$1 } from "../utils/useMessage.js";
import { StaticFileBytesCache } from "../utils/staticFileBytes.js";
import { selects } from "./config.js";
import { runRobotBusiness } from "./robotBusiness.js";
import _lvy_asset_0_default from "../_virtual/_lvy-asset_0.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/strategy.ts
const imageSource = /$file:/.test(_lvy_asset_0_default) ? _lvy_asset_0_default : `file://${_lvy_asset_0_default}`;
const imageBytes = new StaticFileBytesCache(imageSource.replace(/^file:\/\//, ""));
var strategy_default = onResponse(selects, async (e) => {
	const [, next] = useEvent();
	if ((await runRobotBusiness(e, "navigation.strategy", {}, (value) => {
		if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length) throw new Error("攻略响应不完整");
		return value;
	}, next)).handled) return;
	const [message] = useMessage$1();
	const format = Format.create();
	let image = imageSource;
	if (e.Platform === "qq-bot" && (e.Target?.scope === "group" || e.Target?.scope === "c2c")) try {
		image = await measureTransportStage("image.file_load", () => imageBytes.load(), e);
	} catch {}
	format.addImage(image);
	message.send({ format });
});

//#endregion
export { strategy_default as default };