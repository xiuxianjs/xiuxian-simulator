export type V4Reward = {
  treasureId: number; name: string; rarity: number; kind: 'body' | 'fragment'; quantity: number; newlyOwned: boolean;
  pullIndex?: number; forcedComplete?: boolean; autoSynthesized?: number; fragmentsRemaining?: number;
};
export function independentReward(rarity: number, pullIndex: number, kind: V4Reward['kind'] = 'body'): V4Reward {
  return { treasureId: rarity * 100 + 1, name: ['锈剑残片', '青铜铃', '玄铁印', '采薇竹篮', '万木春符', '九天息壤'][rarity - 1], rarity, kind, quantity: 1, newlyOwned: false, pullIndex };
}
export function independentResult(count: 1 | 10 = 1) {
  const rewards = count === 1
    ? [6, 5, 4].map(rarity => independentReward(rarity, 1))
    : [...Array.from({ length: 9 }, (_, i) => independentReward(1, i + 1, 'fragment')), ...[6, 5, 4].map(rarity => ({ ...independentReward(rarity, 10), forcedComplete: true }))];
  return { operationId: 'v4-original', rulesVersion: 'treasure-v4-independent-20261029', message: '上古遗珍探索完成', source: 'spirit_crystal', count, paidAmount: count === 1 ? 1200 : 10800, experienceGranted: count * 100, rewards };
}
type Result = ReturnType<typeof independentResult>;
export function validIndependentResults(): Array<[string, Result]> {
  const fragment = independentResult();
  fragment.rewards = [{ ...independentReward(6, 1, 'fragment'), quantity: 3, autoSynthesized: 1, fragmentsRemaining: 2, newlyOwned: true }];
  const lowBody = independentResult();
  lowBody.rewards = [independentReward(1, 1)];
  const twoBodies = independentResult();
  twoBodies.rewards = [independentReward(4, 1), independentReward(5, 1)];
  const earlyBody = independentResult(10);
  earlyBody.rewards = [independentReward(6, 1), ...Array.from({ length: 9 }, (_, i) => independentReward(1, i + 2, 'fragment'))];
  const repeat = independentResult(10);
  repeat.rewards = [independentReward(6, 1), independentReward(6, 2), ...Array.from({ length: 8 }, (_, i) => independentReward(1, i + 3, 'fragment'))];
  const thirty = independentResult(10);
  thirty.rewards = Array.from({ length: 10 }, (_, i) => [6, 5, 4].map(rarity => independentReward(rarity, i + 1))).flat();
  return [
    ['单次三档同时出本体', independentResult()], ['十连末次三档形态保证', independentResult(10)],
    ['单碎片正常自动合成', fragment], ['未中高档时只有低档本体', lowBody], ['同次两档本体', twoBodies],
    ['提前出本体后末次可为碎片', earlyBody], ['同名本体在不同探索序号可重复', repeat], ['十连三十条本体奖励', thirty]
  ];
}
export function invalidIndependentResults(): Array<[string, Result]> {
  const single = (change: (value: Result) => void): Result => { const value = independentResult(); change(value); return value; };
  const ten = (change: (value: Result) => void): Result => { const value = independentResult(10); change(value); return value; };
  return [
    ['缺失探索序号', single(value => { delete value.rewards[0].pullIndex; })],
    ['探索序号为零', single(value => { value.rewards[0].pullIndex = 0; })],
    ['探索序号越界', single(value => { value.rewards[0].pullIndex = 2; })],
    ['探索序号非整数', single(value => { value.rewards[0].pullIndex = .5; })],
    ['缺少一轮序号', ten(value => { value.rewards[0].pullIndex = 2; })],
    ['单轮碎片与本体混合', single(value => { value.rewards.push(independentReward(1, 1, 'fragment')); })],
    ['单轮多条碎片', single(value => { value.rewards = [independentReward(1, 1, 'fragment'), independentReward(2, 1, 'fragment')]; })],
    ['单轮相同高档重复', single(value => { value.rewards[1] = { ...value.rewards[0] }; })],
    ['低档与高档本体混出', single(value => { value.rewards[1] = independentReward(1, 1); })],
    ['单轮超过三件本体', single(value => { value.rewards.push(independentReward(4, 1)); })],
    ['完整本体数量为二', single(value => { value.rewards[0].quantity = 2; })],
    ['碎片数量超过三', single(value => { value.rewards = [{ ...independentReward(1, 1, 'fragment'), quantity: 4 }]; })],
    ['碎片数量为零', single(value => { value.rewards = [{ ...independentReward(1, 1, 'fragment'), quantity: 0 }]; })],
    ['完整本体伪装自动合成', single(value => { value.rewards[0].autoSynthesized = 1; })],
    ['单轮碎片合成超过一本体', single(value => { value.rewards = [{ ...independentReward(1, 1, 'fragment'), autoSynthesized: 2 }]; })],
    ['自动合成余片越界', single(value => { value.rewards = [{ ...independentReward(1, 1, 'fragment'), autoSynthesized: 1, fragmentsRemaining: 10 }]; })],
    ['经验按奖励条数误增', single(value => { value.experienceGranted = 300; })],
    ['单抽伪称十连形态保证', single(value => { value.rewards.forEach(reward => { reward.forcedComplete = true; }); })],
    ['十连无完整本体', ten(value => { value.rewards = Array.from({ length: 10 }, (_, i) => independentReward(1, i + 1, 'fragment')); })],
    ['末次缺少形态保证标记', ten(value => { value.rewards.slice(9).forEach(reward => { reward.forcedComplete = false; }); })],
    ['末次三本体标记不一致', ten(value => { value.rewards[9].forcedComplete = false; })],
    ['前九已出本体却末次称保证', ten(value => { value.rewards[0] = independentReward(1, 1); })],
    ['宝物编号与稀有度不符', single(value => { value.rewards[0].treasureId = 401; })],
    ['未知规则版本', single(value => { value.rulesVersion = 'treasure-future-unknown'; })]
  ];
}
