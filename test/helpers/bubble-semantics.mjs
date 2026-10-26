// Compare gameplay facts and command targets while allowing reviewed prose and
// whitespace cleanup. Confirmation costs, risk text and quantities are retained.
export function bubbleSemantics(messages, extraCommands = []) {
  const texts = [], commands = [], mentions = [], images = [];
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== 'object') return;
    if (node.type === 'MD.button' || node.type === 'Button') { commands.push(node.options?.data); return; }
    if (node.type === 'MD.text' || node.type === 'MD.bold') texts.push(String(node.value));
    if (node.type?.includes('mention')) mentions.push(node.value);
    if (node.type?.toLowerCase().includes('image')) images.push(node);
    if (Array.isArray(node.value)) visit(node.value);
  }
  visit(messages);
  const text = texts.join('\n')
    .replace(/(?:💡可通过 \/我的功法 查看功法状态|💡功法已被分解，可通过 \/我的储物袋 功法 查看剩余功法)/g, '')
    .replace(/请发送：[^\n]+|确认指令：[^\n]+/g, '')
    .replace(/你与[^\n]+的高级誓约已生效，后续道侣祝福与纪念日档位将按高级誓约结算/g, '')
    .replace('完成指引后将正式写入职业信息，并解锁丹方与职业工具。', '完成后解锁职业、丹方与工具')
    .replace('首充双倍: 仅普通充值生效，且只对有双倍档位的套餐显示标记。', '普通充值 · 首充双倍以套餐标记为准')
    .replace('⚠️⚠️⚠️限时活动临时套餐请使用 /活动充值；普通充值不会触发限时活动规则。', '活动套餐与返利见 /活动充值')
    .replace('后续通知优先在本群 @ 你；群权限关闭时保留订阅，恢复授权后自动恢复。', '通知优先发至本群，权限受限时可查看通知记录。')
    .replace('通知均可通过 /我的通知 回看；开启订阅不代表平台已允许主动发言。', '')
    .replace('可通过商店购买、里程碑奖励等途径获取', '')
    .replace('点击下方分类查看物品', '')
    .replace(/点击按钮查看物品列表:/g, '')
    .replace(/\s+/g, ' ').trim();
  return { text, commands: [...new Set([...commands, ...extraCommands])].sort(), mentions, images };
}
