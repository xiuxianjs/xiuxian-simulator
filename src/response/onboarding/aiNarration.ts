import { Format, Expose, type FormatMarkDown } from 'alemonjs';

// Optional provider: old Link versions and model failures keep the original bubble.
// A late response cannot send anything or rerun gameplay.
export async function appendAINarration(md: FormatMarkDown, text: string): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const client = Expose.create();

    if (!client.list().some(provider => provider.name === 'alemonjs-agent-link' && provider.protocol === 'agent-link.game-narration.v1')) {
      return;
    }
    const result = await Promise.race([
      client.call('agent-link.game-narration.v1', 'alemonjs-agent-link', 'narrate', { text: text.slice(0, 12000) }),
      new Promise<null>(resolve => {
        timer = setTimeout(() => resolve(null), 8500);
      })
    ]);

    if (!result?.ok) {
      return;
    }
    const value = result.data as { text?: unknown };

    if (typeof value.text === 'string' && value.text.trim() && value.text.length <= 200) {
      md.addNewline().addBlockquote(Format.createMarkdown().addText(value.text));
    }
  } catch {
    // Presentation only; the caller always retains the authoritative receipt.
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
