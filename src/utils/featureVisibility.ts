import { Format, logger, type DataEnums, type OutgoingMessage } from 'alemonjs';
import { getBackendConfig } from '../api/bot/config';
import { getBackendPresentationAccess, parseBackendTianshuContent, type TianshuContent } from '../api/bot/tianshu-content';
import { presentationAccessFor } from '../api/bot/presentation-access-state';

type Policy = { commands: [string, string][]; zero: Set<string> };
type CommandFilter = ((command: string) => boolean) & { known?: (command: string) => boolean };
type Runtime = { policy?: Policy; pending?: Promise<void> };
// Configuration, not player data. Separate app instances cannot share a backend's policy.
const runtimes = new Map<string, Runtime>();
let activated = false;
const runtimeKey = () => {
  const config = getBackendConfig();

  return { config, key: JSON.stringify([config.url, config.robotAuthToken]) };
};
const canonical = (value: string) => value
    .trim()
    .replace(/^[!！/#＃]/, '')
    .trim()
    .replace(/\s+/g, ' ');

function policyFrom(content: TianshuContent): Policy {
  if (content.gateVersion !== 1 || !content.commandFeatures || !content.featureCatalog) {
    throw new Error('服务端缺少完整的气泡功能规则');
  }
  const features = new Map(content.featureCatalog.flatMap(group => group.features.map(feature => [feature.id, feature] as const)));
  const commands = Object.entries(content.commandFeatures);

  if (!commands.length || commands.some(([, feature]) => !features.has(feature))) {
    throw new Error('气泡指令规则引用了未知功能');
  }

  return {
    commands: commands.sort(([a], [b]) => b.length - a.length || a.localeCompare(b)),
    zero: new Set([...features].filter(([, feature]) => feature.realmReached).map(([id]) => id))
  };
}

/** Activate before loading: a failed startup must not expose a broad menu. */
export async function startFeatureVisibility(): Promise<void> {
  activated = true;
  const { config, key } = runtimeKey();
  const runtime = runtimes.get(key) ?? {};

  runtimes.set(key, runtime);
  if (runtime.policy) {
    return;
  }
  runtime.pending ??= (async () => {
    if (!config.url || !config.robotAuthToken) {
      throw new Error('后端 API 未配置');
    }
    const response = await fetch(`${config.url}/api/v1/content/tianshu`, {
      headers: { Authorization: `Bearer ${config.robotAuthToken}` },
      signal: AbortSignal.timeout(config.timeoutMs)
    });

    if (!response.ok) {
      throw new Error(`功能规则读取失败 (${response.status})`);
    }
    const envelope = (await response.json()) as { data?: unknown };

    runtime.policy = policyFrom(parseBackendTianshuContent(envelope.data));
  })();
  const pending = runtime.pending;

  try {
    await pending;
  } finally {
    if (runtime.pending === pending) {
      runtime.pending = undefined;
    }
  }
}

function featureFor(command: string, policy: Policy): string | undefined {
  const text = canonical(command);

  return policy.commands.find(([alias]) => text === alias || text.startsWith(alias + ' '))?.[1];
}

export async function presentationCommandFilter(event?: object & { UserId?: string }): Promise<CommandFilter> {
  const { key } = runtimeKey();
  const runtime = runtimes.get(key) ?? {};

  // Standalone renderers/tests may be used without the game application lifecycle.
  if (!activated) {
    return () => true;
  }
  runtimes.set(key, runtime);
  if (!runtime.policy) {
    try {
      await startFeatureVisibility();
    } catch {
      /* Unknown rules stay hidden; next message may retry. */
    }
  }
  const policy = runtime.policy;

  if (!policy) {
    return () => false;
  }
  let reached: Record<string, boolean> = Object.fromEntries([...policy.zero].map(id => [id, true]));

  if (event?.UserId) {
    try {
      reached = await presentationAccessFor(event, () => getBackendPresentationAccess(event.UserId!));
    } catch {
      logger.warn('气泡功能状态暂不可用，仅显示已确认的零门槛入口');
    }
  }

  return Object.assign(
    (command: string) => {
      const feature = featureFor(command, policy);

      return feature !== undefined && reached[feature] === true;
    },
    { known: (command: string) => featureFor(command, policy) !== undefined }
  );
}

/** Clone the message tree: quote snapshots, retries and shared templates stay intact. */
function filterFeatureText(text: string, allowed: CommandFilter): string {
  return text
    .split('\n')
    .filter(line => {
      const commands = [...line.matchAll(/(?=(?:^|[\s·：:（(【[])([/!！#＃](?![/\s\d])[^/!！#＃\n\]】）)]*))/g)].map(match => match[1]);

      // Record IDs (#42), player text and URLs are data, not navigation entries.
      return commands.every(command => (allowed.known && !allowed.known(command) ? true : allowed(command)));
    })
    .join('\n');
}

export function filterFeatureFormat(format: Format, allowed: CommandFilter): Format {
  const walk = (nodes: unknown[]): unknown[] => nodes.flatMap(raw => {
      if (!raw || typeof raw !== 'object') {
        return [raw];
      }
      const node = raw as { type: string; value?: unknown; options?: { type?: string; data?: string } };

      if (node.type === 'MD.button' || node.type === 'Button') {
        if (node.options?.type === 'link') {
          return [raw];
        }
        if (!node.options?.data || !allowed(node.options.data)) {
          return [];
        }
      }
      if (Array.isArray(node.value)) {
        const value = walk(node.value);

        if (!value.length) {
          return [];
        }
        // A navigation row starts with its entry button. Hide its description too;
        // owned-object quotes start with their data and remain readable.
        if (
          node.type === 'MD.blockquote' &&
          (node.value[0] as { type?: string })?.type === 'MD.button' &&
          !value.some(child => (child as { type?: string })?.type === 'MD.button')
        ) {
          return [];
        }

        return [{ ...node, value }];
      }
      if (typeof node.value === 'string' && ['Text', 'MD.text', 'MD.content', 'MD.blockquote', 'MarkdownOriginal'].includes(node.type)) {
        const value = filterFeatureText(node.value, allowed);

        return value || node.value === '' ? [{ ...node, value }] : [];
      }

      return [raw];
    });
  const result = Format.create();

  result.value.push(...(walk(format.value) as DataEnums[]));

  return result;
}

export function filterOutgoingFeatures(content: OutgoingMessage, allowed: CommandFilter): OutgoingMessage {
  const keyboard = content.keyboard;
  const rows = keyboard?.rows?.map(row => row.filter(button => button.action.type === 'link' || allowed(button.action.data))).filter(row => row.length > 0);

  return {
    ...content,
    ...(content.text !== undefined ? { text: filterFeatureText(content.text, allowed) } : {}),
    ...(content.markdown?.content !== undefined ? { markdown: { ...content.markdown, content: filterFeatureText(content.markdown.content, allowed) } } : {}),
    // Opaque platform templates have no inspectable commands; do not expose them.
    ...(keyboard ? { keyboard: rows?.length ? { rows } : undefined } : {})
  };
}
