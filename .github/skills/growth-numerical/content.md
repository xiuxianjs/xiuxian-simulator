## **1. 文件结构**

> ⚠️ **成长数值唯一的实现位置是服务端**（`../xiuxian-game-server`）。
> 客户端已删除 `src/model/**` 与 `src/db/**`：不涨经验、不算面板、不做突破判定。
> 客户端只负责「发起请求 + 渲染服务端返回的进度与结论」。

### 服务端 · 成长业务

| 服务端实现                                                                                                                        | 用途                                 |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| [internal/service/realm_service.go](../xiuxian-game-server/internal/service/realm_service.go)                                     | 境界突破/晋级逻辑                    |
| [internal/service/realm_promotion_transaction.go](../xiuxian-game-server/internal/service/realm_promotion_transaction.go)         | 晋级的原子事务                       |
| [internal/service/realm_overview.go](../xiuxian-game-server/internal/service/realm_overview.go)                                   | 境界总览与渡劫投影                   |
| [internal/service/seclusion_experience_settlement.go](../xiuxian-game-server/internal/service/seclusion_experience_settlement.go) | 修为增减与闭关经验结算               |
| [internal/battle/attributes.go](../xiuxian-game-server/internal/battle/attributes.go)                                             | 玩家面板计算（五维→战斗属性）        |
| [internal/service/battle_attributes_service.go](../xiuxian-game-server/internal/service/battle_attributes_service.go)             | 面板查询投影                         |
| [internal/service/equipment_service.go](../xiuxian-game-server/internal/service/equipment_service.go)                             | 装备系统                             |
| [internal/service/skill_book_service.go](../xiuxian-game-server/internal/service/skill_book_service.go)                           | 功法系统                             |
| [internal/service/skill_book_experience.go](../xiuxian-game-server/internal/service/skill_book_experience.go)                     | 功法经验返还                         |
| [internal/service/meditation_service.go](../xiuxian-game-server/internal/service/meditation_service.go)                           | 打坐系统                             |
| [internal/service/meridian_service.go](../xiuxian-game-server/internal/service/meridian_service.go)                               | 经络系统                             |
| [internal/service/soul_artifact_service.go](../xiuxian-game-server/internal/service/soul_artifact_service.go)                     | 本命物系统                           |
| [internal/service/soul_wash_service.go](../xiuxian-game-server/internal/service/soul_wash_service.go)                             | 本命物洗涤                           |
| [internal/service/seclusion_service.go](../xiuxian-game-server/internal/service/seclusion_service.go)                             | 闭关系统                             |
| [internal/service/mental_service.go](../xiuxian-game-server/internal/service/mental_service.go)                                   | 精力/元力系统                        |
| [internal/service/a7_remaining_service.go](../xiuxian-game-server/internal/service/a7_remaining_service.go)                       | 培元丹使用与确认（`PeiyuanService`） |
| [internal/service/peiyuan_cancel.go](../xiuxian-game-server/internal/service/peiyuan_cancel.go)                                   | 培元丹取消                           |

> 炼气极限突破的倍率由 [internal/battle/attributes.go](../xiuxian-game-server/internal/battle/attributes.go) 与
> [internal/service/realm_service.go](../xiuxian-game-server/internal/service/realm_service.go) 共同决定；
> 五维上限、境界倍率的唯一来源都在那里。

### 客户端 · 只保留类型与展示

| 客户端文件                                                                      | 用途                   |
| ------------------------------------------------------------------------------- | ---------------------- |
| [src/constants/skillBook.ts](../../../src/constants/skillBook.ts)               | 功法品级等**展示枚举** |
| [src/types/skillBook.ts](../../../src/types/skillBook.ts)                       | 功法展示类型           |
| [src/api/bot/realm-overview.ts](../../../src/api/bot/realm-overview.ts)         | 境界总览接口封装       |
| [src/api/bot/realm-breakthrough.ts](../../../src/api/bot/realm-breakthrough.ts) | 突破接口封装           |
| [src/api/bot/realm-promotion.ts](../../../src/api/bot/realm-promotion.ts)       | 晋级接口封装           |
| [src/api/bot/attribute-panel.ts](../../../src/api/bot/attribute-panel.ts)       | 面板接口封装           |
| [src/api/bot/meditation.ts](../../../src/api/bot/meditation.ts)                 | 打坐接口封装           |
| [src/api/bot/meridian.ts](../../../src/api/bot/meridian.ts)                     | 经络接口封装           |
| [src/api/bot/seclusion-status.ts](../../../src/api/bot/seclusion-status.ts)     | 闭关状态接口封装       |
| [src/api/bot/peiyuan-confirm.ts](../../../src/api/bot/peiyuan-confirm.ts)       | 培元丹确认接口封装     |

> ⚠️ 客户端的品级 / 经络名称等枚举只用于**渲染**；成长判定（能否突破、加多少属性）全在服务端。
> 客户端 `src/constants/**` 里**没有**闭关、VIP 之类的玩法数值常量，需要展示时从接口取。

### 数据表

境界、装备模板、功法、经络、本命物等配置表**只在服务端与共享 DB SDK 里有模型定义**（`github.com/xiuxianjs/xiuxian-game-db-sdk/gamemodels`）。
客户端不再有 `src/db/models/**`，也不应复制这些表结构。

---

## **2. 境界系统**

**核心实现** — [internal/service/realm_service.go](../xiuxian-game-server/internal/service/realm_service.go)；
晋级事务在 [internal/service/realm_promotion_transaction.go](../xiuxian-game-server/internal/service/realm_promotion_transaction.go)

### 双层境界结构

- **大境界**（stageLevel）：凡人(0) → 炼气(1) → 筑基(2) → 金丹(3) → 元婴(4) → 化神(5) → 洞虚(6) → 大乘(7) → 仙(8) → 金仙(9) → 道祖(10)
- **小层级**（level）：每个大境界内含多个小层级，由服务端的境界配置表定义

你不能新增大境界而不同步更新所有引用 `stageLevel` 的代码（渡劫/秘境解锁/经络解锁/本命物等级上限等）。

### 小境界突破（同一大境界内）

- **条件**：修为 ≥ `experienceLimit` + 消耗材料
- **100% 成功**，无概率判定
- 成功后：`新修为 = max(0, 当前修为 - experienceLimit)`，溢出保留

### 大境界晋级（三条路径）

| 路径       | 适用范围                      | 机制                |
| ---------- | ----------------------------- | ------------------- |
| **直升**   | 凡人→炼气 (0→1)               | 直接成功            |
| **概率制** | 炼气→筑基 (1→2)               | 概率判定            |
| **渡劫制** | 筑基→金丹 及之后 (2→3 ~ 9→10) | 材料消耗 + 渡劫战斗 |

### 炼气→筑基概率公式

```
finalProbability = min(1.0, baseRate + pillBonus + pityBonus)
```

- `baseRate` = **0.30**（30%）
- `pillBonus` = 使用筑基丹数量 × **0.05**（每颗 +5%）
- `pityBonus` = 失败次数 × **0.03**（每次 +3%，最多 10 次 = +30%）
- 上限 = **100%**
- 炼气 9 层即可尝试（`qiLayer ≥ 9`）

你不能修改基础概率或保底系数而不同时验证最差情况（0 筑基丹 + 10 次失败 = 60%）和最好情况（10 筑基丹 = 80%）是否合理。

### 晋级失败惩罚

- **修为扣除 60%**：`remainingExp = floor(currentExp × 0.4)`
- **保底累计**：仅炼气→筑基，`failedCount + 1`
- **属性减益 debuff**：非炼气→筑基的失败，服务端会施加属性减益（属性降低 X%，持续 N 小时）
- 减益期间不可再次晋级

---

## **3. 炼气极限突破**

**核心实现** — [internal/service/realm_service.go](../xiuxian-game-server/internal/service/realm_service.go) 与
[internal/battle/attributes.go](../xiuxian-game-server/internal/battle/attributes.go) 的上限倍率计算

炼气超过 9 层继续突破再晋级筑基，获得**永久属性上限加成**：

| 炼气层数 | 属性上限加成 | 筑基前缀 |
| -------- | ------------ | -------- |
| ≤ 9      | 0%           | —        |
| 10       | **+1%**      | **人道** |
| 11       | **+2%**      | **地道** |
| ≥ 12     | **+3%**      | **天道** |

乘数公式：`multiplier = 1 + maxAttributeBonus / 100`

此乘数影响五维上限计算，进而影响暴击率/暴击伤害的归一化公式。你不能修改这里而不理解对战斗面板的连锁影响。

---

## **4. 修为（经验）系统**

**核心实现** — [internal/service/seclusion_experience_settlement.go](../xiuxian-game-server/internal/service/seclusion_experience_settlement.go) 等结算入口

### 修为上限

```
maxAllowedExp = experienceLimit × 2
```

`experienceLimit` = 当前境界的升级所需修为（服务端境界配置）。你不能假设上限等于 1 倍。

### 月卡加成

```typescript
if (月卡未过期 && amount > 0) {
  finalAmount = Math.floor(amount * 1.1); // +10%
}
```

月卡只影响增加，不影响减少。你在做数值测算时必须考虑有/无月卡两种情况。

### 修为增减核心逻辑

1. `Math.ceil()` 取整
2. 正值增加 → 检查月卡
3. 夹紧到 `[0, experienceLimit × 2]`
4. 原子更新

---

## **5. 五维属性（培元丹系统）**

**核心实现** — [internal/service/a7_remaining_service.go](../xiuxian-game-server/internal/service/a7_remaining_service.go)（`PeiyuanService.Use` / `Confirm`）、
[internal/service/peiyuan_cancel.go](../xiuxian-game-server/internal/service/peiyuan_cancel.go)

### 五维属性随机范围

| 属性         | 中文 | 最小值 | 最大值 |
| ------------ | ---- | ------ | ------ |
| strength     | 力量 | **-3** | **+5** |
| intelligence | 智慧 | **-3** | **+5** |
| constitution | 体质 | **-3** | **+4** |
| agility      | 敏捷 | **-3** | **+4** |
| luck         | 气运 | **-3** | **+3** |

你不能修改这些范围而不重新验证：力量/智慧的期望值偏正（有利）、气运的期望值接近0（中性），这是刻意的设计。

### 核心机制

- 每次随机选 **3 个**属性（已满的跳过）
- 确认超时：**60 秒**
- **多颗服用**：每颗独立随机 → 3 属性变化求和 > 0 的保留、≤ 0 的丢弃 → 保留颗按属性累加
- 增益不超过境界上限（`realm.maxXxx × 炼气极限突破倍率`）
- 减益不低于 0
- 五维全满时无法使用
- 取消/超时不返还培元丹

> 待确认状态保存在服务端（Redis + 持久化锚点），客户端只做「确认 / 取消」两个动作。

---

## **6. 装备系统**

**核心实现** — [internal/service/equipment_service.go](../xiuxian-game-server/internal/service/equipment_service.go)

### 属性浮动

```
attribute_variance = 0.05（默认）
```

- 不指定 varianceRatio 时：随机 **-5% ~ 0%**（只向下浮动）
- 指定 varianceRatio 时：固定使用该比率（绝对值不超过 maxVariance）
- 整数属性：`Math.floor(base × (1 + ratio))`
- 小数属性：保留 2 位小数

你不能修改浮动规则而不考虑对万宝楼/交易所定价体系的影响（同模板装备会有不同属性值）。

### 装备属性维度（14 个）

- **固定值**：physicalAttack, magicAttack, physicalDefense, magicDefense, hp, speed
- **百分比**：physicalAttackPercent, magicAttackPercent, physicalDefensePercent, magicDefensePercent, hpPercent, critRate, critDamage

### 升级系统

- 基础成功率：**70%**
- 最大升级等级：**10**

### 套装效果

套装效果按 2 件套和 4 件套激活，配置在服务端的装备配置里，属性格式与装备一致。

---

## **7. 功法系统**

**核心实现** — [internal/service/skill_book_service.go](../xiuxian-game-server/internal/service/skill_book_service.go)；
经验返还在 [internal/service/skill_book_experience.go](../xiuxian-game-server/internal/service/skill_book_experience.go)

### 状态流

```
未鉴定(0) → 已鉴定(1) → 已学习(2) → 使用中(3)
```

你不能跳过状态直接从 0 到 3，状态流转必须逐步进行。

### 功法品级

1=凡物, 2=法器, 3=灵器, 4=灵宝, 5=仙器, 6=道器

### 熟练度加成

每 1% 熟练度 = 该功法所有属性词条 +1% 增幅：

```
实际功法加成 = 功法基础词条值 × (1 + 熟练度% / 100)
```

### 经验返还公式

| 品级 | 基础返还经验 |
| ---- | ------------ |
| 1    | 100          |
| 2    | 200          |
| 3    | 300          |

```
totalRefundExp = floor((baseRefundExp + upgradeCount × requiredExp) × expReturnMultiplier)
```

你不能修改返还公式而不考虑玩家通过"养高级功法→分解→获取经验"的循环是否会产生经济漏洞。

---

## **8. 打坐与经络系统**

**核心实现** — [internal/service/meditation_service.go](../xiuxian-game-server/internal/service/meditation_service.go)、
[internal/service/meridian_service.go](../xiuxian-game-server/internal/service/meridian_service.go)

### 打坐

| 参数         | 值                     |
| ------------ | ---------------------- |
| 每周期产真气 | **1**                  |
| 周期时长     | **15 分钟**            |
| 每日真气上限 | **86**                 |
| 最大打坐时长 | **1290 分钟**（21.5h） |

> ⚠️ 打坐接入服务端是**单独开关**控制的（不能靠已有域开关隐式启用），迁移期由服务端与机器人两侧配置共同决定是否走 API。

### 经络系统

| 参数           | 值                             |
| -------------- | ------------------------------ |
| 经络总数       | **20**（12 正经 + 8 奇经八脉） |
| 每条所需进度   | **1000**                       |
| 冲脉消耗       | **10 真气**                    |
| 冲脉增加进度   | **+10**                        |
| 每日冲脉上限   | **5 次**                       |
| 真灵丹额外上限 | **+5 次/日**                   |
| 解锁条件       | 筑基大境界（stageLevel ≥ 2）   |

### 跳脉概率

| 经络进度区间 | 跳脉概率 |
| ------------ | -------- |
| 0 ~ 332      | **10%**  |
| 333 ~ 665    | **5%**   |
| 666 ~ 999    | **1%**   |

跳脉触发时经络直接打通（进度→1000）。你不能修改概率而不验证平均打通时间是否合理。

### 经络加成表（20 条）

**十二正经：**

| #   | 经络         | 加成             |
| --- | ------------ | ---------------- |
| 1   | 手太阴肺经   | 物防+3%, 法防+3% |
| 2   | 手厥阴心包经 | 物防+3%, 法防+3% |
| 3   | 手少阴心经   | 法防+5%          |
| 4   | 手阳明大肠经 | 物攻+3%, 法攻+3% |
| 5   | 手少阳三焦经 | 物攻+3%, 法攻+3% |
| 6   | 手太阳小肠经 | 法攻+5%          |
| 7   | 足太阴脾经   | 生命+3%, 速度+3% |
| 8   | 足厥阴肝经   | 生命+3%, 速度+3% |
| 9   | 足少阴肾经   | 生命+5%          |
| 10  | 足阳明胃经   | 速度+3%, 灵力+3% |
| 11  | 足少阳胆经   | 速度+3%, 灵力+3% |
| 12  | 足太阳膀胱经 | 速度+5%          |

**奇经八脉：**

| #   | 经络   | 加成        |
| --- | ------ | ----------- |
| 13  | 任脉   | 物攻+5%     |
| 14  | 督脉   | 法攻+5%     |
| 15  | 冲脉   | 灵力+5%     |
| 16  | 带脉   | 速度+5%     |
| 17  | 阴跷脉 | 生命+5%     |
| 18  | 阳跷脉 | 生命+5%     |
| 19  | 阴维脉 | 暴击伤害+5% |
| 20  | 阳维脉 | 暴击伤害+5% |

**全通总加成**：物攻+14%, 法攻+24%, 物防+6%, 法防+11%, 生命+22%, 速度+20%, 暴击伤害+10%

> ⚠️ 注意第 10、11 经络的"灵力+3%"不是战斗属性，是打坐资源加成。经络加成中真正影响战斗面板的属性是：物攻%/法攻%/物防%/法防%/生命%/速度%/暴击伤害%。

你不能修改任何一条经络的加成而不重新计算全通总加成，并验证对战斗面板的影响。

---

## **9. 本命物系统**

**核心实现** — [internal/service/soul_artifact_service.go](../xiuxian-game-server/internal/service/soul_artifact_service.go)、
[internal/service/soul_wash_service.go](../xiuxian-game-server/internal/service/soul_wash_service.go)

### 品级

| gradeId | 名称 | 升品消耗（同品级武器数） |
| ------- | ---- | ------------------------ |
| 1       | 凡物 | 4                        |
| 2       | 法器 | 4                        |
| 3       | 灵器 | 5                        |
| 4       | 灵宝 | 5                        |
| 5       | 仙器 | 6                        |
| 6       | 道器 | —（最高）                |

### 面板公式

```
数值型属性 = 品级基础值 + 品级基础值 × 等级 / 36 + 洗涤附加
百分比型属性 = 洗涤值
```

- **数值型**：patk, matk, pdef, mdef, hp, speed
- **百分比型**：critRate, hitRate, dodgeRate, antiCritRate, critDmgRate
- **最大等级** = **36**（对应道祖）
- **每级消耗** = **100 筑灵石**（itemId=70）
- **解锁条件** = 金丹初期（realmId=17）

36 是品级基础值的除数。你不能修改这个数字而不理解它代表最大等级（道祖），修改会导致所有本命物数值发生变化。

### 洗涤品质阶梯

| 洗涤次数 | 品质 | 每次加成范围 |
| -------- | ---- | ------------ |
| 1 ~ 10   | 普通 | 1% ~ 5%      |
| 11 ~ 30  | 良品 | 3% ~ 10%     |
| 31 ~ 60  | 精品 | 5% ~ 15%     |
| 61+      | 极品 | 10% ~ 20%    |

每次消耗 1 洗涤石（itemId=71）。

---

## **10. 渡劫系统**

**核心实现** — [internal/service/realm_service.go](../xiuxian-game-server/internal/service/realm_service.go)、
[internal/service/realm_overview.go](../xiuxian-game-server/internal/service/realm_overview.go)（渡劫投影）；
战斗部分复用 [internal/battle/engine.go](../xiuxian-game-server/internal/battle/engine.go)

所有大境界晋升（筑基→金丹及之后）需渡劫战斗，逐层挑战，任一层失败则整体失败。最多 **30 回合/层**。

| 渡劫     | 晋升 | 层数 | 怪物数值概要                  |
| -------- | ---- | ---- | ----------------------------- |
| 金身劫   | 2→3  | 1    | HP:3k, ATK:760, DEF:380       |
| 三九雷劫 | 3→4  | 3    | HP:10k~~14k, ATK:1.5k~~1.9k   |
| 化神劫   | 4→5  | 3    | HP:17k~~22k, ATK:3.6k~~4.8k   |
| 虚空劫   | 5→6  | 4    | HP:36k~~54k, ATK:7.8k~~12k    |
| 天道劫   | 6→7  | 5    | HP:78k~~130k, ATK:17k~~28k    |
| 仙劫     | 7→8  | 6    | HP:180k~~300k, ATK:36k~~60k   |
| 金仙劫   | 8→9  | 7    | HP:350k~~742k, ATK:65k~~138k  |
| 鸿蒙道劫 | 9→10 | 9    | HP:675k~~1.5M, ATK:135k~~303k |

层数递增，怪物数值每层递增。你不能修改某一层的怪物数值而不验证对应境界顶配玩家是否能通关。

---

## **11. 闭关系统**

**核心实现** — [internal/service/seclusion_service.go](../xiuxian-game-server/internal/service/seclusion_service.go)、
[internal/service/seclusion_experience_settlement.go](../xiuxian-game-server/internal/service/seclusion_experience_settlement.go)

### 时长与消耗

| 时长(h) | 精力消耗 | 经验基数 | 需闭关卡          |
| ------- | -------- | -------- | ----------------- |
| 48      | 100      | 600      | ❌                |
| 72      | 150      | 800      | ❌                |
| 96      | 200      | 900      | ✅（普通最高72h） |
| 120     | 250      | 1100     | ✅                |

### 经验公式

```
exp = floor(dungeonExpReward / dungeonSpiritCost × EXP_BASE[duration] × 0.7)
```

效率系数 = **0.7**

### 提前出关规则（12h 块结算）

| 已完成              | 收益率             |
| ------------------- | ------------------ |
| < 12h               | 退还精力，无奖励   |
| 12h ~ 35h（1~2 块） | 每块 **35%** 收益  |
| ≥ 36h（3+ 块）      | 每块 **100%** 收益 |

每 12h 块固定奖励：灵石 75、精力丹 1、元力丹 1

### 闭关卡加成

- 固定奖励倍率：**×1.2**
- 稀有掉落概率倍率：**×1.7**

你不能修改提前出关的 35% 惩罚或 12h 块结算逻辑而不考虑对玩家行为的引导影响（设计意图是鼓励完整闭关）。

---

## **12. 精力与体力**

### 精力

**核心实现** — [internal/service/mental_service.go](../xiuxian-game-server/internal/service/mental_service.go)

| 参数       | 值                      |
| ---------- | ----------------------- |
| 上限       | **500**（所有境界统一） |
| 恢复速率   | 每 **5 分钟** +1        |
| 满恢复时间 | 2500 分钟 ≈ 41.7 小时   |

服务端用持久化锚点 + 共享 Redis 锚点计算自动恢复；精力满时停止恢复。重复请求与回滚不会留下单边加点。

### 体力

> ⚠️ **体力系统在当前代码库中没有实现**：服务端没有体力恢复与消耗逻辑，客户端也没有地图探索指令入口。
> 下面这行是历史设计记录，**不能据此实现代码**。

| 参数       | 值                  |
| ---------- | ------------------- |
| 上限       | **200**             |
| 恢复速率   | 每 **6 分钟** +1    |
| 满恢复时间 | 1200 分钟 = 20 小时 |
| 移动消耗   | **2 体力/次**       |

你不能修改恢复速率/上限而不同步验证对闭关（精力消耗 100~250）、秘境（精力消耗）等系统的影响。

---

## **13. 成长体系数值流向**

```
培元丹 → 五维属性 ──┐
境界 → 基础属性 ──────┤
装备 → 固定值+百分比 ─┤
功法 → 固定值+百分比 ─┤──→ internal/battle/attributes.go → 战斗面板 → 战斗引擎
经络 → 百分比加成 ─────┤
本命物 → 固定值 ───────┤
套装 → 2/4件效果 ──────┘

炼气极限突破 → 五维上限倍率 → 影响归一化计算（暴击率/暴击伤害）
境界减益 debuff → 临时降低面板属性
```

所有成长子系统的数值最终汇入服务端 [internal/battle/attributes.go](../xiuxian-game-server/internal/battle/attributes.go) 的 `CalculateAttributes(...)`，
再由 [internal/service/battle_attributes_service.go](../xiuxian-game-server/internal/service/battle_attributes_service.go) 投影成面板查询结果。
你修改任何子系统的数值贡献方式时，必须理解它在这个汇聚点的位置和影响范围。
客户端只渲染面板结果，**不要在前端重算面板**。
