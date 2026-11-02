// Shared by the manual registration bubble and the AI result envelope.
export const NEWCOMER_PROLOGUE =
  '陨星荒野边缘，通往桃花镇的山径渐渐隐入夜色。你正辨认方向，一根幡杆忽然横在身前。\n\n黑袍修士扫过你空着的双手：“凡人？倒省了麻烦。”\n\n他转动幡杆，阴冷的黑雾贴着地面向你漫来。\n\n系统：先退开，别碰那团黑雾。';
export const GUIDE_ACTION_BAR = [
  { label: '继续', command: '/继续' },
  { label: '跳过剧情', command: '/跳过引导' }
];

export const newcomerGreeting = (name: string): string => `我是系统，接下来带你熟悉修行。${name}，你的仙途从此刻开始。`;

// Labels describe the next existing /继续 action; no new route or story branch.
export function guideActionBar(action?: string) {
  const labels: Record<string, string> = {
    'step-3': '寻找破绽',
    'step-4': '尝试晋级',
    'promotion-failed': '核对后再试',
    'step-5': '领取起步资源'
  };

  return GUIDE_ACTION_BAR.map(button => (button.command === '/继续' && action && labels[action] ? { ...button, label: labels[action] } : button));
}
