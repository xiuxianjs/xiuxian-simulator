import { Expose } from 'alemonjs';
const observed = new WeakSet<object>();

/** Notify the optional AI presenter before a manual business request. */
export async function beginGamePresentation(event: object): Promise<void> {
  if (observed.has(event)) {
    return;
  }
  observed.add(event);
  try {
    const client = Expose.create();

    if (
      !client
        .list()
        .some(provider => provider.name === 'alemonjs-agent-link' && provider.protocol === 'agent-link.game-narration.v1' && provider.actions.begin_input)
    ) {
      return;
    }
    await client.call('agent-link.game-narration.v1', 'alemonjs-agent-link', 'begin_input', {});
  } catch {
    // Missing/older Link never blocks the game.
  }
}
