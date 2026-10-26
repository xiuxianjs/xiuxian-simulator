export function soulQueryAdvice(text) {
  if (/元婴(?:期)?及以上方可/.test(text)) return [
    { text: '核对当前境界、修为和精力', command: '/我的信息' },
    { text: '挑战主线获取修为', command: '/查看主线' },
    { text: '满足条件后再突破', command: '/我的境界' },
    { text: '闭关积累真气与修为', command: '/闭关' }
  ];
  return [
    { text: '不代表道途、进度或材料已清空', command: '/我的信息' },
    { text: '不把暂时无法计算当作零加成或战斗已失效', command: '/元婴神魂' }
  ];
}
