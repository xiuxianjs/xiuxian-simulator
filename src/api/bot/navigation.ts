export type BackendNavigation = { registered: boolean; moreVisibleCommands: string[]; foldVisibleCommands: string[] };

export function parseBackendNavigation(value: unknown): BackendNavigation {
  const data = value as BackendNavigation;

  if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.registered !== 'boolean') {
    throw new Error('导航响应不完整');
  }
  for (const commands of [data.moreVisibleCommands, data.foldVisibleCommands]) {
    if (!Array.isArray(commands) || !commands.every(command => typeof command === 'string')) {
      throw new Error('导航响应不完整');
    }
  }

  return data;
}
