import { bubbleSemantics } from './bubble-semantics.mjs';

// Compare all original gameplay facts, targets and broadcasts across the
// reviewed card regrouping. Experience moves beside other credited rewards.
export function robberyBubbleSemantics(messages) {
  const result = bubbleSemantics(messages);
  result.text = result.text
    .replace(/目标：|胜负：/g, '')
    .replace(/战斗类型：(\d+v\d+),回合数：(\d+)/g, '$1 $2回合')
    .replace(/消耗元力：(\d+),今日剩余：(\d+\/\d+)/g, '元力 -$1 今日剩余$2次')
    .replace(/消耗元力：(\d+),🔄 反击模式（不消耗次数、不增加煞气）/g, '元力 -$1 不扣次数 煞气不变')
    .replace(/对方身无分文|本次没有货币转移/g, '未获得货币')
    .replace(/原物暂存：/g, '暂存：')
    .replace('原物已恢复原主使用。', '物品已归还原主。')
    .replace('原物已交付原打劫者。', '物品已交付打劫者。')
    .replace('原物已确定归原打劫者，仍在暂存等待交付。', '物品已确定归打劫者，待交付。')
    .replace('原物仍在暂存，以战报最新状态为准。', '物品暂存中。')
    .replace('本次没有暂存原物。', '本次无暂存物品。');
  result.experience = [...result.text.matchAll(/(?:获得)?修为[：\s]*\+(\d+)/g)].map(match=>match[1]).sort();
  result.text = result.text.replace(/(?:获得)?修为[：\s]*\+\d+/g,'')
    .replace(/[✅❌💰😈🎁📖]/gu,'')
    .replace(/[\s·,:：]/g,'');
  return result;
}
