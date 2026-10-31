import { Format, getCurrentEvent, useMessage as useFrameworkMessage, type DataEnums } from 'alemonjs';
import { compactButtonSpacing } from './compactButtonSpacing';
import { manualCommandLinks } from './manualCommandLinks';
import { filterFeatureFormat, filterOutgoingFeatures, presentationCommandFilter } from './featureVisibility';
import { isLearnedBooksTimingEvent, measureTransportStage } from './transportTiming';

type MessageClient = ReturnType<typeof useFrameworkMessage>[0];

/** Preserve SDK results and retries; measure the actual send promise, including void callers. */
export function timedMessageClient(message: MessageClient, traceEvent: Parameters<typeof measureTransportStage>[2] = getCurrentEvent()): MessageClient {
  return {
    ...message,
    send: async params => {
      const allowed = isLearnedBooksTimingEvent(traceEvent)
        ? await measureTransportStage('presentation.access', () => presentationCommandFilter(traceEvent), traceEvent)
        : await presentationCommandFilter(traceEvent);
      const filter = (value: Format | DataEnums[]) => {
        if (value instanceof Format) {
          return manualCommandLinks(compactButtonSpacing(filterFeatureFormat(value, allowed)));
        }
        const format = Format.create();

        format.value.push(...value);

        return manualCommandLinks(compactButtonSpacing(filterFeatureFormat(format, allowed))).value;
      };
      const filtered = Array.isArray(params)
        ? (filter(params) as DataEnums[])
        : params
          ? {
              ...params,
              ...(params.format ? { format: filter(params.format) } : {}),
              ...(params.content ? { content: filterOutgoingFeatures(params.content, allowed) } : {})
            }
          : params;

      return measureTransportStage('platform.send', () => message.send(filtered), traceEvent);
    }
  };
}

export const useMessage: typeof useFrameworkMessage = event => {
  const [message] = useFrameworkMessage(event);

  return [timedMessageClient(message, event ?? getCurrentEvent())] as const;
};
