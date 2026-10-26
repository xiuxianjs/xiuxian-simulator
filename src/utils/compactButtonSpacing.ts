import { Format, type DataEnums } from 'alemonjs';

/** 只移除同一行相邻 Markdown 按钮之间的空白，保留正文间隔和换行。 */
export function compactButtonSpacing(format: Format): Format {
  const walk = (nodes: unknown[]): unknown[] => nodes.flatMap((raw, index) => {
      if (!raw || typeof raw !== 'object') {
        return [raw];
      }
      const node = raw as { type: string; value?: unknown };
      const isSpace = (value: unknown) => {
        const item = value as { type?: string; value?: unknown } | undefined;

        return item?.type === 'MD.text' && typeof item.value === 'string' && /^[ \t]*$/.test(item.value);
      };

      if (isSpace(node)) {
        let left = index - 1;
        let right = index + 1;

        while (left >= 0 && isSpace(nodes[left])) {
          left--;
        }
        while (right < nodes.length && isSpace(nodes[right])) {
          right++;
        }
        if ((nodes[left] as { type?: string } | undefined)?.type === 'MD.button' && (nodes[right] as { type?: string } | undefined)?.type === 'MD.button') {
          return [];
        }
      }

      return [{ ...node, ...(Array.isArray(node.value) ? { value: walk(node.value) } : {}) }];
    });
  const result = Format.create();

  result.value.push(...(walk(format.value) as DataEnums[]));

  return result;
}
