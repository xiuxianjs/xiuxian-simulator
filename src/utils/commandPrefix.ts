import { Format, getConfig, type DataEnums, type OutgoingMessage } from 'alemonjs';
import { getAppConfig } from './appConfig';

type NativeCommand = { prefix: string; space?: boolean; format?: { enabled?: boolean; match?: string; replacement?: string } };

/** 新版框架配置优先；旧插件配置仅作兼容。 */
export function getNativeCommand(): NativeCommand | undefined {
  const apps = getConfig().value?.apps;
  const entry = apps && !Array.isArray(apps) ? apps['xiuxian-game'] : undefined;

  return entry && typeof entry === 'object' && entry.enabled !== false ? entry.command : undefined;
}

export const getCommandSpace = (): boolean => getNativeCommand()?.space ?? false;

function sourceCommand(command: string): string {
  const format = getNativeCommand()?.format;

  if (format?.enabled && format.match && new RegExp(format.match).exec(command)?.index === 0) {
    return command;
  }

  return /^[\u3400-\u9fff]/.test(command) ? '/' + command : command;
}

function projectedCommand(command: string): string {
  const policy = getNativeCommand();
  const format = policy?.format;

  if (!policy || !format?.enabled || !format.match) {
    return command;
  }
  const regex = new RegExp(format.match);
  const match = regex.exec(command);

  const body = match?.index === 0 ? command.replace(regex, format.replacement ?? '') : undefined;

  return body ? policy.prefix + (policy.space ? ' ' : '') + body : command;
}

const prefixes = new WeakMap<object, string>();
const bareCommands = new WeakMap<object, boolean>();

/** 路由和消息出口共用；修改配置后重启机器人。 */
export function getCommandPrefix(): string {
  const native = getNativeCommand();

  if (native) {
    return native.prefix;
  }
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

/** 使用框架 routeText.allowBare；未配置前缀时保留裸指令兼容。 */
export function getCommandAllowBare(): boolean {
  if (getNativeCommand()) {
    return false;
  }
  const config = getConfig();
  const cached = bareCommands.get(config);

  if (cached !== undefined) {
    return cached;
  }
  const settings = getAppConfig();
  const allowBare: unknown = settings.routeText?.allowBare;

  if (allowBare !== undefined && typeof allowBare !== 'boolean') {
    throw new Error('xiuxian-game.routeText.allowBare 必须是布尔值');
  }
  const value = allowBare ?? settings.commandPrefix === undefined;

  bareCommands.set(config, value);

  return value;
}

/** 文本命令必须使用当前配置前缀；前缀后直接跟命令，不接受叠加 /。 */
export function hasCommandPrefix(text: string, prefix = getCommandPrefix(), allowBare = getCommandAllowBare(), space?: boolean): boolean {
  if (space === undefined && arguments.length < 2) {
    const native = getNativeCommand();

    if (native) {
      space = native.space ?? false;
    }
  }
  const value = text.trimStart().replace(/^notAutoConfirmation:/, '');

  if (space !== undefined && value.startsWith(prefix)) {
    const rest = value.slice(prefix.length);

    return space ? /^[ \t]+[\p{L}\p{N}]/u.test(rest) : /^[\p{L}\p{N}]/u.test(rest);
  }

  return value.startsWith(prefix) ? /^[\p{L}\p{N}]/u.test(value.slice(prefix.length).trimStart()) : allowBare && /^[\p{L}\p{N}]/u.test(value);
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
  if (arguments.length < 2 && getNativeCommand()) {
    // Keep source commands for the framework's single send-time conversion.
    const source = sourceCommand(command);

    if ([...projectedCommand(source)].length > 80) {
      throw new Error('配置前缀后的按钮指令超过 80 字符，请缩短前缀或重新生成预览');
    }

    return source;
  }
  const result = formatCommandText(command, prefix);

  if (prefix !== '/' && hasCommandPrefix(result, prefix, false) && [...result].length > 80) {
    throw new Error('配置前缀后的按钮指令超过 80 字符，请缩短前缀或重新生成预览');
  }

  return result;
}

/** 普通文字中的可执行指令；与按钮源数据分开，不依赖 format 开关。 */
export function displayCommandText(command: string): string {
  const policy = getNativeCommand();

  if (!policy) {
    return commandText(command);
  }

  return policy.prefix + (policy.space ? ' ' : '') + command.replace(/^[/#＃!！]\s*/, '');
}

/** 校验最终发送长度，不修改节点，不截断凭据。 */
export function assertCommandBudget(format: Format | DataEnums[]): void {
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(walk);

      return;
    }
    if (!value || typeof value !== 'object') {
      return;
    }
    const node = value as { type?: string; value?: unknown; options?: { type?: string; data?: string; commandTarget?: string | false } };
    const options = node.options;

    if (
      (node.type === 'Button' || node.type === 'MD.button') &&
      options &&
      (options.type === undefined || options.type === 'command') &&
      typeof options.data === 'string'
    ) {
      let projected = options.data;
      const apps = getConfig().value?.apps;
      const target = typeof options.commandTarget === 'string' && apps && !Array.isArray(apps) ? apps[options.commandTarget] : undefined;
      const policy =
        options.commandTarget === false
          ? undefined
          : typeof options.commandTarget === 'string'
            ? target && typeof target === 'object' && target.enabled !== false
              ? target.command
              : undefined
            : getNativeCommand();
      const rule = policy?.format;

      if (policy && rule?.enabled && rule.match) {
        const regex = new RegExp(rule.match);

        if (regex.exec(projected)?.index === 0) {
          const body = projected.replace(regex, rule.replacement ?? '');

          if (body) {
            projected = policy.prefix + (policy.space ? ' ' : '') + body;
          }
        }
      }
      if ([...projected].length > 80) {
        throw new Error('配置前缀后的按钮指令超过 80 字符，请缩短前缀或重新生成预览');
      }
    }
    if (node.value && typeof node.value === 'object') {
      walk(node.value);
    }
  };

  walk(format instanceof Format ? format.value : format);
}

export function prefixCommandData(value: Format | DataEnums[]): Format | DataEnums[] {
  if (value instanceof Format) {
    return prefixCommandFormat(value);
  }
  const format = Format.create();

  format.value.push(...value);

  return prefixCommandFormat(format).value;
}

/** 预算校验使用实际前缀，超预算由校验器报告而不是提前抛错。 */
export const commandCharacterLength = (command: string): number => {
  const projected = getNativeCommand() ? projectedCommand(sourceCommand(command)) : formatCommandText(command, getCommandPrefix());

  return [...projected].length;
};

/** 旧处理器和 Go 仍使用原始的 / 指令契约；仅在本包处理期间转换。 */
export function internalCommandText(text: string, prefix = getCommandPrefix()): string {
  if (text.startsWith('notAutoConfirmation:')) {
    return 'notAutoConfirmation:' + internalCommandText(text.slice(20), prefix);
  }
  const value = text.trimStart();

  return value.startsWith(prefix) ? '/' + value.slice(prefix.length).trimStart() : text;
}

/** 克隆整棵树，覆盖直接构造的 MD.button、引用块和全局键盘。 */
export function prefixCommandFormat(format: Format): Format {
  const walk = (nodes: unknown[]): unknown[] => nodes.map(raw => {
      if (!raw || typeof raw !== 'object') {
        return raw;
      }
      const node = raw as { type?: string; value?: unknown; options?: { type?: string; data?: string; commandTarget?: string | false } };
      const button = node.type === 'MD.button' || node.type === 'Button';

      return {
        ...node,
        ...(button &&
        node.options?.commandTarget === undefined &&
        (node.options?.type === undefined || node.options.type === 'command') &&
        typeof node.options?.data === 'string'
          ? { options: { ...node.options, data: commandText(node.options.data) } }
          : {}),
        ...(Array.isArray(node.value) ? { value: walk(node.value) } : {})
      };
    });
  const result = Format.create();

  result.value.push(...(walk(format.value) as DataEnums[]));
  assertCommandBudget(result);

  return result;
}

export function prefixOutgoingCommands(content: OutgoingMessage): OutgoingMessage {
  return {
    ...content,
    ...(content.keyboard
      ? {
          keyboard: {
            ...content.keyboard,
            rows: content.keyboard.rows?.map(row => row.map(button => button.action.type !== 'command'
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
