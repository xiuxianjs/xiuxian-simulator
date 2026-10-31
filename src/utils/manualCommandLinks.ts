import { Format, type DataEnums } from 'alemonjs';

/** QQ command links fill the input; sending remains an explicit user action. */
export function manualCommandLinks(format: Format): Format {
  const walk = (nodes: unknown[]): unknown[] => nodes.map(raw => {
    if (!raw || typeof raw !== 'object') {
      return raw;
    }
    const node = raw as { type?: string; value?: unknown; options?: Record<string, unknown> };
    const options = node.type === 'MD.button' ? { ...node.options, autoEnter: false } as Record<string, unknown> : undefined;

    if (options) {
      // qqbot-cmd-enter does not support show.
      delete options.show;
    }

    return {
      ...node,
      ...(options ? { options } : {}),
      ...(Array.isArray(node.value) ? { value: walk(node.value) } : {})
    };
  });
  const result = Format.create();

  result.value.push(...walk(format.value) as DataEnums[]);

  return result;
}
