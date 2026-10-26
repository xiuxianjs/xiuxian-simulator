export type SoulPathKey = 'xuan_fa' | 'lian_ti' | 'yu_qi';
export type SoulPathReceipt = {
  message: string;
  pathKey: SoulPathKey;
  pathName: string;
  nodeName: string;
  pathSwitchAvailableAt: string | null;
};

/** Go SoulPathActionResult is shared by choosing, switching and advancing. */
export function parseSoulPathReceipt(value: unknown, message: string): SoulPathReceipt {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }
  const data = value as Record<string, unknown>;

  if (
    typeof data.message !== 'string' ||
    (data.pathKey !== 'xuan_fa' && data.pathKey !== 'lian_ti' && data.pathKey !== 'yu_qi') ||
    typeof data.pathName !== 'string' ||
    typeof data.nodeName !== 'string' ||
    (data.pathSwitchAvailableAt !== null && typeof data.pathSwitchAvailableAt !== 'string')
  ) {
    throw new Error(message);
  }

  return { message: data.message, pathKey: data.pathKey, pathName: data.pathName, nodeName: data.nodeName, pathSwitchAvailableAt: data.pathSwitchAvailableAt };
}
