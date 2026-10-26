/** 平台私聊标记优先，兼容旧游戏事件与任务展示副本。 */
export function isPrivateEvent(event?: { IsPrivate?: boolean; isPrivate?: boolean; name?: string }): boolean {
  return event?.IsPrivate ?? (event?.name?.startsWith('private.') ? true : (event?.isPrivate ?? false));
}

export function normalizePrivateEvent(event: { IsPrivate?: boolean; isPrivate?: boolean; name?: string }): void {
  event.isPrivate = isPrivateEvent(event);
}
