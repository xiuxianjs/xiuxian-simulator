import { Format, getConfig, type DataEnums, type OutgoingMessage } from 'alemonjs';
import { getAppConfig } from './appConfig';

const prefixes = new WeakMap<object, string>();

/** 路由和消息出口共用；修改配置后重启机器人。 */
export function getCommandPrefix(): string {
  const config = getConfig();
  const cached = prefixes.get(config);

  if (cached !== undefined) {
    return cached;
  }
  const prefix: unknown = getAppConfig().commandPrefix;

  if (prefix === undefined) {
    prefixes.set(config, '/');

    return '/';
  }
  if (typeof prefix !== 'string' || !prefix.length || /\s/.test(prefix)) {
    throw new Error('xiuxian-game.commandPrefix 必须是非空且不含空白的字符串');
  }

  prefixes.set(config, prefix);

  return prefix;
}

/** 文本命令必须使用当前配置前缀；前缀后直接跟命令，不接受叠加 /。 */
export function hasCommandPrefix(text: string, prefix = getCommandPrefix()): boolean {
  const value = text.trimStart().replace(/^notAutoConfirmation:/, '');

  return value.startsWith(prefix) && /^[\p{L}\p{N}]/u.test(value.slice(prefix.length).trimStart());
}

/** 统一构造按钮、input 的完整命令；参数和凭据保持原文。 */
function formatCommandText(command: string, prefix: string): string {
  const internal = 'notAutoConfirmation:';

  if (command.startsWith(internal)) {
    return internal + formatCommandText(command.slice(internal.length), prefix);
  }
  if (!command || /^https?:\/\//i.test(command) || command.startsWith(prefix)) {
    return command;
  }
  const body = command.replace(/^\//, '');

  // 版本化非文本回调不参与命令前缀替换。
  return /^[\u3400-\u9fff]/.test(body) ? prefix + body : command;
}

export function commandText(command: string, prefix = getCommandPrefix()): string {
  const result = formatCommandText(command, prefix);

  if (prefix !== '/' && hasCommandPrefix(result, prefix) && [...result].length > 80) {
    throw new Error('配置前缀后的按钮指令超过 80 字符，请缩短前缀或重新生成预览');
  }

  return result;
}

/** 预算校验使用实际前缀，超预算由校验器报告而不是提前抛错。 */
export const commandCharacterLength = (command: string): number => [...formatCommandText(command, getCommandPrefix())].length;

/** 旧处理器和 Go 仍使用原始的 / 指令契约；仅在本包处理期间转换。 */
export function internalCommandText(text: string, prefix = getCommandPrefix()): string {
  if (text.startsWith('notAutoConfirmation:')) {
    return 'notAutoConfirmation:' + internalCommandText(text.slice(20), prefix);
  }
  const value = text.trimStart();

  return value.startsWith(prefix) ? '/' + value.slice(prefix.length) : text;
}

/** 克隆整棵树，覆盖直接构造的 MD.button、引用块和全局键盘。 */
export function prefixCommandFormat(format: Format): Format {
  const walk = (nodes: unknown[]): unknown[] => nodes.map(raw => {
      if (!raw || typeof raw !== 'object') {
        return raw;
      }
      const node = raw as { type?: string; value?: unknown; options?: { type?: string; data?: string } };
      const button = node.type === 'MD.button' || node.type === 'Button';

      return {
        ...node,
        ...(button && node.options?.type !== 'link' && typeof node.options?.data === 'string'
          ? { options: { ...node.options, data: commandText(node.options.data) } }
          : {}),
        ...(Array.isArray(node.value) ? { value: walk(node.value) } : {})
      };
    });
  const result = Format.create();

  result.value.push(...(walk(format.value) as DataEnums[]));

  return result;
}

export function prefixOutgoingCommands(content: OutgoingMessage): OutgoingMessage {
  return {
    ...content,
    ...(content.keyboard
      ? {
          keyboard: {
            ...content.keyboard,
            rows: content.keyboard.rows?.map(row => row.map(button => button.action.type === 'link'
                  ? button
                  : {
                      ...button,
                      action: { ...button.action, data: commandText(button.action.data) }
                    }
              )
            )
          }
        }
      : {})
  };
}
