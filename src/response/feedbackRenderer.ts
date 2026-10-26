import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';

export type BusinessFeedbackRenderer = ((reply: RobotMiddlewareReply) => Promise<void>) & { preservesAdvice?: true };

/** Opt in only after the custom renderer displays every structured advice item. */
export function adviceRenderer(render: (reply: RobotMiddlewareReply) => Promise<void>): BusinessFeedbackRenderer {
  return Object.assign(render, { preservesAdvice: true as const });
}
