import { Expose } from 'alemonjs';

export type ConversationContinuation = { active: boolean; flow?: string; hasNameDraft?: boolean; choices?: string[] };
export type ConversationRoute = 'matched' | 'unmatched' | 'ambiguous' | 'unavailable' | 'legacy';

/** A provider owns topic recognition. This read grants no execution authority. */
export async function routePluginConversation(protocol: string, provider: string, continuation: ConversationContinuation): Promise<ConversationRoute> {
  const client = Expose.create();
  const action = client.list().find(item => item.protocol === protocol && item.name === provider)?.actions.route_conversation;

  if (!action) {
    return 'legacy';
  }
  if (action.effect !== 'read') {
    return 'unavailable';
  }
  try {
    const result = await client.call(protocol, provider, 'route_conversation', continuation, { timeoutMs: 1000 });
    const data = result.ok ? (result.data as { protocol?: string; decision?: string }) : undefined;

    return data?.protocol === 'plugin-conversation-route.v1' && ['matched', 'unmatched', 'ambiguous'].includes(data.decision ?? '')
      ? (data.decision as ConversationRoute)
      : 'unavailable';
  } catch {
    return 'unavailable';
  }
}
