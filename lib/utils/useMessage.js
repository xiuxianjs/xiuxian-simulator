import { isLearnedBooksTimingEvent, measureTransportStage } from "./transportTiming.js";
import { compactButtonSpacing } from "./compactButtonSpacing.js";
import { manualCommandLinks } from "./manualCommandLinks.js";
import { filterFeatureFormat, filterOutgoingFeatures, presentationCommandFilter } from "./featureVisibility.js";
import { Format, getCurrentEvent, useMessage as useMessage$1 } from "alemonjs";

//#region src/utils/useMessage.ts
/** Preserve SDK results and retries; measure the actual send promise, including void callers. */
function timedMessageClient(message, traceEvent = getCurrentEvent()) {
	return {
		...message,
		send: async (params) => {
			const allowed = isLearnedBooksTimingEvent(traceEvent) ? await measureTransportStage("presentation.access", () => presentationCommandFilter(traceEvent), traceEvent) : await presentationCommandFilter(traceEvent);
			const filter = (value) => {
				if (value instanceof Format) return manualCommandLinks(compactButtonSpacing(filterFeatureFormat(value, allowed)));
				const format = Format.create();
				format.value.push(...value);
				return manualCommandLinks(compactButtonSpacing(filterFeatureFormat(format, allowed))).value;
			};
			const filtered = Array.isArray(params) ? filter(params) : params ? {
				...params,
				...params.format ? { format: filter(params.format) } : {},
				...params.content ? { content: filterOutgoingFeatures(params.content, allowed) } : {}
			} : params;
			return measureTransportStage("platform.send", () => message.send(filtered), traceEvent);
		}
	};
}
const useMessage = (event) => {
	const [message] = useMessage$1(event);
	return [timedMessageClient(message, event ?? getCurrentEvent())];
};

//#endregion
export { timedMessageClient, useMessage };