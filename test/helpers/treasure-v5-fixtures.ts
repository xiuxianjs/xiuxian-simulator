import { independentResult, independentReward } from './treasure-v4-fixtures';

export function priorityResult(count: 1 | 10 = 1) {
  const result = independentResult(count);
  result.operationId = 'v5-original';
  result.rulesVersion = 'treasure-v5-priority-20261029';
  result.rewards = count === 1 ? result.rewards.slice(0, 1) : result.rewards.slice(0, 10);
  return result;
}
type Result = ReturnType<typeof priorityResult>;
export function validPriorityResults(): Array<[string, Result]> {
  const fragment = priorityResult();
  fragment.rewards = [{ ...independentReward(6, 1, 'fragment'), quantity: 3, autoSynthesized: 1, fragmentsRemaining: 2, newlyOwned: true }];
  const low = priorityResult(); low.rewards = [independentReward(1, 1)];
  const early = priorityResult(10);
  early.rewards = [independentReward(6, 1), ...Array.from({ length: 9 }, (_, i) => independentReward(1, i + 2, 'fragment'))];
  const repeat = priorityResult(10);
  repeat.rewards = [independentReward(6, 1), independentReward(6, 2), ...Array.from({ length: 8 }, (_, i) => independentReward(1, i + 3, 'fragment'))];
  const tenBodies = priorityResult(10); tenBodies.rewards = Array.from({ length: 10 }, (_, i) => independentReward(6, i + 1));
  return [['单次仅一条本体', priorityResult()], ['十连末次形态保证仅一本体', priorityResult(10)], ['碎片正常自动合成', fragment], ['低档完整本体', low], ['提前完整后末次碎片', early], ['同一本体不同序号可重复', repeat], ['十连每次一本体共十条', tenBodies]];
}
export function invalidPriorityResults(): Array<[string, Result]> {
  const single = (change: (value: Result) => void): Result => { const value = priorityResult(); change(value); return value; };
  const ten = (change: (value: Result) => void): Result => { const value = priorityResult(10); change(value); return value; };
  return [
    ['缺少探索序号', single(value => { delete value.rewards[0].pullIndex; })],
    ['探索序号零', single(value => { value.rewards[0].pullIndex = 0; })],
    ['探索序号越界', single(value => { value.rewards[0].pullIndex = 2; })],
    ['探索序号非整数', single(value => { value.rewards[0].pullIndex = .5; })],
    ['重复索引导致漏轮', ten(value => { value.rewards[0].pullIndex = 2; })],
    ['v5不能以旧v4三本体当作本次奖励', single(value => { value.rewards = independentResult().rewards; })],
    ['遗漏一轮奖励', ten(value => { value.rewards.pop(); })],
    ['本体数量超过一', single(value => { value.rewards[0].quantity = 2; })],
    ['碎片数量超过三', single(value => { value.rewards = [{ ...independentReward(1, 1, 'fragment'), quantity: 4 }]; })],
    ['碎片数量为零', single(value => { value.rewards = [{ ...independentReward(1, 1, 'fragment'), quantity: 0 }]; })],
    ['本体错误自动合成', single(value => { value.rewards[0].autoSynthesized = 1; })],
    ['单次碎片自动合成两本体', single(value => { value.rewards = [{ ...independentReward(1, 1, 'fragment'), autoSynthesized: 2 }]; })],
    ['自动合成余片越界', single(value => { value.rewards = [{ ...independentReward(1, 1, 'fragment'), autoSynthesized: 1, fragmentsRemaining: 10 }]; })],
    ['经验与探索次数不符', single(value => { value.experienceGranted = 300; })],
    ['单次伪称十连保证', single(value => { value.rewards[0].forcedComplete = true; })],
    ['十连末次保证标记缺失', ten(value => { delete value.rewards[9].forcedComplete; })],
    ['前九已有完整末次却称保证', ten(value => { value.rewards[0] = independentReward(1, 1); })],
    ['十连全碎片', ten(value => { value.rewards = Array.from({ length: 10 }, (_, i) => independentReward(1, i + 1, 'fragment')); })],
    ['宝物编号与稀有度不符', single(value => { value.rewards[0].treasureId = 401; })],
    ['未知版本', single(value => { value.rulesVersion = 'treasure-future-unknown'; })]
  ];
}
