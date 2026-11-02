import { Format, Expose, getCurrentEvent, type FormatMarkDown } from 'alemonjs';

// Optional provider: old Link versions and model failures keep the original bubble.
// A late response cannot send anything or rerun gameplay.
export async function appendAINarration(md: FormatMarkDown, text: string): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const client = Expose.create();

    if (!client.list().some(provider => provider.name === 'alemonjs-agent-link' && provider.protocol === 'agent.presentation.v1')) {
      return;
    }
    const result = await Promise.race([
      client.call('agent.presentation.v1', 'alemonjs-agent-link', 'narrate', { text: text.slice(0, 12000) }),
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

// Resolve only narrator slots, never character names, commands or game facts.
const narratorNames = new WeakMap<object, Promise<string>>();

export async function guideText(text: string): Promise<string> {
  const event = getCurrentEvent();

  if (!event) {
    return text.replace(/\{\{guide\.name\}\}/gu, '系统');
  }
  let name = narratorNames.get(event);

  if (!name) {
    name = (async () => {
      let timer: ReturnType<typeof setTimeout> | undefined;

      try {
        const client = Expose.create();

        if (!client.list().some(p => p.name === 'alemonjs-agent-link' && p.protocol === 'agent.presentation.v1' && p.actions.narrator)) {
          return '系统';
        }
        const result = await Promise.race([
          client.call('agent.presentation.v1', 'alemonjs-agent-link', 'narrator', {}),
          new Promise<null>(resolve => {
            timer = setTimeout(() => resolve(null), 1000);
          })
        ]);
        const value = result?.ok ? (result.data as { name?: unknown }).name : undefined;

        return typeof value === 'string' && value.trim() && [...value].length <= 40 && !/[\r\n]/u.test(value) ? value : '系统';
      } catch {
        return '系统';
      } finally {
        if (timer) {
          clearTimeout(timer);
        }
      }
    })();
    narratorNames.set(event, name);
  }
  const resolved = await name;

  return text.replace(/\{\{guide\.name\}\}/gu, resolved).replace(/^系统(?=[:： ·])/gmu, resolved);
}
