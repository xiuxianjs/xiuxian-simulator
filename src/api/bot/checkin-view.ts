export type CheckInViewButton = { label: string; command: string };
export type CheckInView = { title: string; blocks: Array<{ text: string; buttons: CheckInViewButton[] }>; buttons: CheckInViewButton[] };
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

function buttons(value: unknown): CheckInViewButton[] {
  if (!Array.isArray(value)) {
    throw new Error('签到日历按钮不完整');
  }

  return value.map(row => {
    if (!record(row) || typeof row.label !== 'string' || typeof row.command !== 'string' || !row.command.startsWith('/') || [...row.command].length > 80) {
      throw new Error('签到日历按钮无效');
    }

    return { label: row.label, command: row.command };
  });
}
export function parseCheckInView(value: unknown): CheckInView {
  if (!record(value) || typeof value.title !== 'string' || !Array.isArray(value.blocks)) {
    throw new Error('签到日历响应不完整');
  }

  return {
    title: value.title,
    blocks: value.blocks.map(row => {
      if (!record(row) || typeof row.text !== 'string') {
        throw new Error('签到日历内容不完整');
      }

      return { text: row.text, buttons: buttons(row.buttons) };
    }),
    buttons: buttons(value.buttons)
  };
}
