import { bubbleSemantics } from './bubble-semantics.mjs';

// Reviewed layout/copy changes only. Keep amounts, rewards, statuses, command
// targets, mentions, images and error reasons comparable to the historical UI.
const headings = new Set(['充值', '充值购买', '首充礼包', '礼包奖励', '新人返利', '周周返利', '【礼包奖励】', '【奖励档位】', '【每日奖励】', '🧴 普通充值', '普通充值', '📅 月卡', '月卡', '😴闭关卡', '✨ 金手指', '金手指', '🎁 优惠礼包', '优惠礼包', '立即获得', '月卡特权', '专属权益', '✅ 充值成功！']);
export function rechargeBubbleSemantics(messages, extraCommands = []) {
  const nodes = structuredClone(messages);
  function prune(value) {
    if (Array.isArray(value)) return value.filter(node => !headings.has(String(node?.value))).map(prune);
    if (value && typeof value === 'object' && Array.isArray(value.value)) value.value = prune(value.value);
    return value;
  }
  const result = bubbleSemantics(prune(nodes), extraCommands);
  result.text = result.text
    .replaceAll('闭关卡', '金手指')
    .replace('💡礼包奖励根据首次充值的金额解锁对应档位，首次充值30元可解锁全部档位！', '')
    .replace('按首次充值金额解锁', '')
    .replace('请选择充值套餐：', '')
    .replace('普通充值 · 首充双倍以套餐标记为准', '')
    .replace('订单已由系统处理完成，请优先查看邮箱、背包或权益状态。', '订单已完成，可查看到账奖励。')
    .replace(/活动进度：第(\d+)天\/共(\d+)天/g, '第$1/$2天')
    .replace(/解锁(\d+元档)奖励！/g, '$1 已领取')
    .replace(/解锁(第\d+天)奖励！/g, '$1 已领取')
    .replace(/领取(周[一二三四五六日]|满勤大奖|第\d+天)奖励成功！/g, '$1 已领取')
    .replace(/· 可领取/g, '')
    .replace(/获得道晶：(\d+)/g, '道晶 +$1')
    .replace(/（赠送 (\d+) \+ 双倍奖励 (\d+)）/g, '（套餐 $1 + 首充双倍 $2）')
    .replace(/VIP升级：/g, 'VIP：')
    .replace(/(\d+)¥/g, '¥$1')
    .replace(/¥(\d+(?:\.\d+)?)/g, '$1元')
    .replace(/(\d+)\.00(?=元|\/)/g, '$1')
    .replace(/赠送(\d+)道晶/g, '道晶 $1')
    .replace(/\b\d+、(?=[^\n]*（)/g, '')
    .replace(/[🧴📅✨🎁😴🎉🧘💎💠📦📖✓]/gu, '')
    .replace(/[\s·,，()（）]/g, '')
    .replace(/(道晶\d+)首充双倍/g, '首充双倍$1');
  return result;
}
