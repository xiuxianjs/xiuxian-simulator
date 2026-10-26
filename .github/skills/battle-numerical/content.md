## **1. 文件结构**

> ⚠️ **战斗数值唯一的实现位置是服务端**（`../xiuxian-game-server`）。
> 客户端已删除 `src/model/**` 与 `src/db/**`，不参与任何战斗计算、属性计算或掉落判定。
> 客户端只保留战斗相关的**类型与展示常量**，用于渲染服务端返回的战斗过程与面板。

### 服务端 · 战斗内核

| 文件                                                                                            | 用途                         |
| ----------------------------------------------------------------------------------------------- | ---------------------------- |
| [internal/battle/engine.go](../xiuxian-game-server/internal/battle/engine.go)                   | 战斗引擎核心 —— 回合流程     |
| ↳ `ResolveDamage(...)`（同文件）                                                                | 伤害计算 —— 数值公式         |
| [internal/battle/buff.go](../xiuxian-game-server/internal/battle/buff.go)                       | Buff 系统 —— 增减益管理      |
| [internal/battle/target_selector.go](../xiuxian-game-server/internal/battle/target_selector.go) | 目标选择器 —— 阵位与攻击模组 |
| [internal/battle/waves.go](../xiuxian-game-server/internal/battle/waves.go)                     | 多波次战斗                   |
| [internal/battle/manual_session.go](../xiuxian-game-server/internal/battle/manual_session.go)   | 手动战斗会话（逐次选择技能） |
| [internal/battle/attributes.go](../xiuxian-game-server/internal/battle/attributes.go)           | 玩家属性计算（五维→面板）    |
| [internal/battle/power.go](../xiuxian-game-server/internal/battle/power.go)                     | 战力公式                     |
| [internal/battle/random.go](../xiuxian-game-server/internal/battle/random.go)                   | 可复现随机源（LCG）          |

> ⚠️ `internal/battle/**` 是纯计算包，不认识数据库，也不读 Redis；
> 它只接收 Unit / Skill / Config，返回 Result。所有取数与结算在 `internal/service/**`。

### 服务端 · 业务层（构建单位、结算奖励）

| 文件                                                                                                                              | 用途                          |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| [internal/service/pve_service.go](../xiuxian-game-server/internal/service/pve_service.go)                                         | 秘境 / 副本                   |
| [internal/service/competitive_pve_service.go](../xiuxian-game-server/internal/service/competitive_pve_service.go)                 | 竞技类 PVE（妖塔 / 通天塔等） |
| [internal/service/storyline_service.go](../xiuxian-game-server/internal/service/storyline_service.go)                             | 主线关卡                      |
| [internal/service/storyline_manual_battle_service.go](../xiuxian-game-server/internal/service/storyline_manual_battle_service.go) | 主线手动战斗会话              |
| [internal/service/pvp_robbery_service.go](../xiuxian-game-server/internal/service/pvp_robbery_service.go)                         | PVP 比试 / 打劫               |
| [internal/service/world_boss_configured_npc.go](../xiuxian-game-server/internal/service/world_boss_configured_npc.go)             | 世界凶兽怪物配置              |
| [internal/service/guild_competition_battle.go](../xiuxian-game-server/internal/service/guild_competition_battle.go)               | 仙门比武                      |
| [internal/service/scarecrow_service.go](../xiuxian-game-server/internal/service/scarecrow_service.go)                             | 稻草人（伤害测试）            |
| [internal/service/battle_attributes_service.go](../xiuxian-game-server/internal/service/battle_attributes_service.go)             | 面板查询投影                  |

### 客户端 · 只保留类型与展示

| 文件                                                                                        | 用途                                |
| ------------------------------------------------------------------------------------------- | ----------------------------------- |
| [src/types/battle.ts](../../../src/types/battle.ts)                                         | 战斗过程 / 结果的展示类型           |
| [src/constants/battle.ts](../../../src/constants/battle.ts)                                 | 攻击模组、Buff 类型等**展示用**枚举 |
| [src/utils/battleLogFormatter.ts](../../../src/utils/battleLogFormatter.ts)                 | 把服务端战斗日志格式化成气泡文本    |
| [src/response/storyline/challenge/res.ts](../../../src/response/storyline/challenge/res.ts) | 主线战斗气泡                        |
| [src/api/bot/storyline-manual-battle.ts](../../../src/api/bot/storyline-manual-battle.ts)   | 手动战斗会话接口封装                |
| [src/api/bot/battle-attributes.ts](../../../src/api/bot/battle-attributes.ts)               | 面板接口封装                        |

> ⚠️ 客户端的 `ATTACK_MODULE` / `BUFF_TYPE` 等枚举必须与服务端
> `internal/battle/target_selector.go`、`internal/battle/buff.go` 的取值保持一致；
> 它们只用于**渲染与格式化**，不参与任何判定。

### 数据表

战斗相关的配置表（`skills`、`skill_buffs`、`npcs`、`dungeon_monsters`、`realms`、`equipment_templates`、`skill_books`、`equipment_set_effects`）**只在服务端与共享 DB SDK 里有模型定义**（`github.com/xiuxianjs/xiuxian-game-db-sdk/gamemodels`）。
客户端不再有 `src/db/models/**`，也不应复制这些表结构。

---

## **2. 阵位系统**

```
前排:  位置1  位置2  位置3
后排:  位置4  位置5  位置6
```

列分布：列1=[1,4]，列2=[2,5]，列3=[3,6]

### 攻击模组（7 种）

| 枚举值 | 模组                    | 效果              |
| ------ | ----------------------- | ----------------- |
| 1      | `single_front_priority` | 对位单体·前排优先 |
| 2      | `single_back_priority`  | 对位单体·后排优先 |
| 3      | `column_front_priority` | 对位整列·前排优先 |
| 4      | `column_back_priority`  | 对位整列·后排优先 |
| 5      | `row_front_priority`    | 整排·前排优先     |
| 6      | `row_back_priority`     | 整排·后排优先     |
| 7      | `all_enemies`           | 全体              |

目标选择优先级：**前后排原则 > 就近原则 > 就左原则**（位置序号小优先）

你不能新增攻击模组枚举值而不同步修改 [internal/battle/target_selector.go](../xiuxian-game-server/internal/battle/target_selector.go) 中的分支，以及客户端 [src/constants/battle.ts](../../../src/constants/battle.ts) 的展示枚举。

---

## **3. 属性系统**

**核心文件** — [internal/battle/attributes.go](../xiuxian-game-server/internal/battle/attributes.go) 的 `CalculateAttributes(...)`

### 3.1 五维→面板换算系数

| 五维      | 物攻 | 物防 | 法攻 | 法防 | HP   | 速度 | 暴击率    | 暴伤      |
| --------- | ---- | ---- | ---- | ---- | ---- | ---- | --------- | --------- |
| 力量(STR) | ×1.0 | ×0.1 | —    | —    | ×0.3 | —    | —         | 归一化    |
| 智慧(INT) | —    | —    | ×1.0 | ×0.2 | —    | —    | 归一化    | 归一化    |
| 体质(CON) | —    | ×0.8 | —    | ×0.7 | ×1.5 | —    | —         | —         |
| 敏捷(AGI) | ×0.2 | ×0.1 | —    | —    | —    | ×1.0 | 归一化×50 | —         |
| 气运(LUK) | —    | —    | ×0.1 | ×0.1 | ×0.2 | ×0.1 | 归一化×40 | 归一化×80 |

**归一化** = 五维值 / maxAttr，其中 `maxAttr = 当前境界五维上限中最大值 × 炼气极限突破倍率`。

你不能修改这些系数而不重新验证不同境界玩家的面板数值范围。

### 3.2 最终属性公式

```
物攻 = (STR×1.0 + AGI×0.2 + 境界 + 装备 + 功法 + 本命物) × (1 + 装备% + 功法% + 经络%)
物防 = (CON×0.8 + STR×0.1 + AGI×0.1 + 境界 + 装备 + 功法 + 本命物) × (1 + 百分比加成)
法攻 = (INT×1.0 + LUK×0.1 + 境界 + 装备 + 功法 + 本命物) × (1 + 百分比加成)
法防 = (CON×0.7 + INT×0.2 + LUK×0.1 + 境界 + 装备 + 功法 + 本命物) × (1 + 百分比加成)
生命 = (STR×0.3 + CON×1.5 + LUK×0.2 + 境界 + 装备 + 功法 + 本命物) × (1 + 百分比加成)
速度 = (AGI×1.0 + LUK×0.1 + 境界 + 装备 + 功法 + 本命物) × (1 + 经络%)
```

> ⚠️ **速度的百分比加成只来自经络**，装备和功法只贡献固定值。你不能假设速度有装备百分比加成。

```
暴击率 = (INT/maxAttr)×10 + (AGI/maxAttr)×50 + (LUK/maxAttr)×40 + 装备 + 功法 + 本命物
暴击伤害 = (150 + (LUK/maxAttr)×80 + (STR/maxAttr)×10 + (INT/maxAttr)×10 + 装备 + 功法 + 本命物) × (1 + 经络%)
```

> ⚠️ **暴击伤害的 `(1 + 经络%)` 乘在整个括号上**（包括基础150和所有加成的总和），不是只乘最后一项。
> 服务端实现里暴击率/暴伤会再按 `scale`（魂道倍率）与 `critPool`（暴击池）分配，改公式前先读 `attributes.go` 的完整实现。

```
抗暴率 = 装备 + 功法 + 本命物
命中率 = 装备 + 功法 + 本命物
闪避率 = 装备 + 功法 + 本命物
```

### 3.3 属性截断

| 属性     | 范围      |
| -------- | --------- |
| 暴击率   | 0% ~ 100% |
| 暴击伤害 | ≥ 150%    |
| 抗暴率   | 0% ~ 100% |
| 命中率   | 0% ~ 100% |
| 闪避率   | 0% ~ 80%  |

你不能输出超过这些范围的数值，也不能修改截断逻辑而不同步修改所有引用处。

### 3.4 功法熟练度

```
实际功法加成 = 功法基础词条值 × (1 + 熟练度% / 100)
```

每 1% 熟练度 = 该功法所有词条 +1% 增幅。

---

## **4. 伤害计算**

**核心文件** — [internal/battle/engine.go](../xiuxian-game-server/internal/battle/engine.go) 的 `ResolveDamage(...)`

### 4.1 基础伤害公式

```
物理伤害 = max(实际物攻 - 实际物防, 0) × 技能倍率
法术伤害 = max(实际法攻 - 实际法防, 0) × 技能倍率
真实伤害 = 实际物攻 × 技能倍率（无视防御）
```

其中"实际攻防"经过两层 Buff 加成：

```
第一层：baseAttack = floor(physicalAttack × (1 + ON_STAT_CALC_buff加成))
第二层：actualAttack = baseAttack × (1 + ON_DAMAGE_CALC_buff加成)
```

> ⚠️ 两层之间有 `Math.floor` 截断（Go 侧是 `floor(...)`）。你不能简化为单层乘法。

技能倍率使用**万分比**：`multiplier / 10000`

### 4.2 伤害流水线（10 步，严格有序）

| 步骤 | 逻辑           | 关键约束                                                   |
| ---- | -------------- | ---------------------------------------------------------- |
| 1    | **命中/闪避**  | `命中率 = clamp(100 + hitRate - dodgeRate, 5, 100)` 保底5% |
| 2    | **无敌检测**   | 目标有 `INVINCIBLE`(type=15) → 伤害=0                      |
| 3    | **基础伤害**   | 两层 Buff（ON_STAT_CALC + ON_DAMAGE_CALC）→ 攻-防 → ×倍率  |
| 4    | **伤害增幅**   | 施法者 `DAMAGE_BONUS`(模组9) buff                          |
| 5    | **暴击判定**   | `实际暴击率 = max(0, critRate - antiCritRate)`             |
| 6    | **伤害减免**   | 目标 `DAMAGE_REDUCTION`(模组10) buff                       |
| 7    | **随机浮动**   | ±10%（`RANDOM_DAMAGE_RANGE = 0.1`）                        |
| 8    | **最小保底**   | `max(伤害, 1)` — **不是**攻击力百分比                      |
| 9    | **扣血&致死**  | 免死buff(`DEATH_IMMUNITY` type=21) → HP=1                  |
| 10   | **受伤后触发** | `AFTER_DAMAGE_TAKEN` 时机的 buff                           |

你不能在步骤之间插入新逻辑而不理解前后步骤的依赖关系。你不能改变步骤顺序。
随机源由 `internal/battle/random.go` 的种子随机提供，改流水线时必须保证同一 seed 仍可复现。

### 4.3 治疗公式

```
治疗量 = floor(施法者攻击力 × (1 + 两层攻击Buff) × 技能倍率)
```

治疗根据 `damageFormula` 决定使用物攻还是法攻。

### 4.4 关键常量

```typescript
DAMAGE_CALC = {
  MIN_DAMAGE_RATIO: 0.05, // ⚠️ 已定义但从未使用（死代码）
  DEFENSE_REDUCTION_RATIO: 0.5, // ⚠️ 已定义但从未使用（死代码）
  RANDOM_DAMAGE_RANGE: 0.1, // ±10% 浮动
  BASE_CRIT_DAMAGE: 150, // 基础暴击伤害 150%
  MULTIPLIER_BASE: 10000 // 万分比基数
};
```

> ⚠️ `MIN_DAMAGE_RATIO` 和 `DEFENSE_REDUCTION_RATIO` 是死代码。你不能引用它们来解释当前伤害公式的行为。如果需要启用它们，属于新功能开发。
> 上表的**展示常量**在客户端 [src/constants/battle.ts](../../../src/constants/battle.ts)；**判定用的常量**在服务端 `internal/battle/**`。改判定必须改服务端，改展示口径才改客户端。

### 4.5 Buff 加成算法

```
totalBonus = Σ (buff.multiplier / 10000) × stacks × (isDebuff ? -1 : 1)
实际属性 = 基础属性 × (1 + totalBonus)
```

DOWN 类型 buff（type=2,4,6）自动取负值。

---

## **5. 技能系统**

### 4 种技能类型

| 类型     | 标识      | 消耗             | 行动后回复       |
| -------- | --------- | ---------------- | ---------------- |
| 普通攻击 | `normal`  | 无               | 念力+20, 灵力+20 |
| 战技     | `battle`  | 灵力(mpCost)     | 念力+10, 灵力+5  |
| 神通     | `divine`  | 念力(spiritCost) | 无回复           |
| 被动技   | `passive` | 自动触发         | 无回复           |

AI 自动选择优先级：**神通 > 战技 > 普通攻击**（资源和冷却可用时）

> 服务端实现见 [internal/battle/engine.go](../xiuxian-game-server/internal/battle/engine.go) 的 `selectAutoSkill(...)` 与 `gainAfterAction(...)`。
> 客户端只展示技能名称、消耗与冷却，不决定出招。

### 被动技触发条件

`round_start` / `hp_below_50_round_start` / `hp_below_30` / `on_crit` / `after_skill` / `after_divine` / `on_hit_taken` / `on_physical_hit_taken` / `on_dodge` / `on_fatal` / `on_kill_or_low_hp`

你不能新增触发条件而不同步修改服务端 [internal/battle/engine.go](../xiuxian-game-server/internal/battle/engine.go) 与 [internal/battle/buff.go](../xiuxian-game-server/internal/battle/buff.go) 中对应的触发逻辑。

---

## **6. Buff 系统**

**核心文件** — [internal/battle/buff.go](../xiuxian-game-server/internal/battle/buff.go)

### 23 种 Buff 类型

| ID  | 类型       | ID  | 类型          | ID  | 类型         |
| --- | ---------- | --- | ------------- | --- | ------------ |
| 1   | 攻击提升   | 9   | 护盾          | 17  | 命中提升     |
| 2   | 攻击降低   | 10  | 持续回血      | 18  | 闪避提升     |
| 3   | 防御提升   | 11  | 持续伤害(DOT) | 19  | 抗暴提升     |
| 4   | 防御降低   | 12  | 眩晕          | 20  | 生命上限提升 |
| 5   | 速度提升   | 13  | 沉默          | 21  | 免死         |
| 6   | 速度降低   | 14  | 反击          | 22  | 额外行动     |
| 7   | 暴击率提升 | 15  | 无敌          | 23  | 即时回复     |
| 8   | 暴伤提升   | 16  | 伤害反弹      |     |              |

你不能新增 ID 24+ 而不在服务端 `BUFF_TYPE` 常量、客户端展示常量
[src/constants/battle.ts](../../../src/constants/battle.ts) 和所有引用处同步更新。

### 双时机系统

**施加时机（applyTiming）** — 何时将 buff 添加到单位身上：

0=技能释放前, 1=技能释放后, 2=伤害计算前, 4=造成伤害后, 5=受到伤害后, 6=回合开始, 7=个人回合开始, 8=个人回合结束, 9=回合结束, 10=击杀, 11=死亡, 12=暴击, 13=被暴击, 14=闪避, 15=被闪避

**生效时机（effectTiming）** — 何时 buff 影响计算：

1=属性计算时(ON_STAT_CALC), 2=伤害计算时(ON_DAMAGE_CALC), 3=治疗计算时, 4=暴击计算时, 5=回合跳动(DOT/HOT), 6=个人回合跳动, 7=即时

**属性模组（module）**：1=物攻, 2=法攻, 3=物防, 4=法防, 5=速度, 6=HP, 7=暴击率, 8=暴伤, 9=伤害加成, 10=伤害减免, 11=命中, 12=闪避, 13=抗暴, 99=特殊

你不能随意组合 applyTiming + effectTiming + module。必须参考现有 `skill_buffs` 表中已有的组合模式。

### 堆叠规则

1. `HEAL_INSTANT`(type=23) + `INSTANT`(effectTiming=7) → 立即生效，不进入 buff 列表
2. 同 id+name 的 buff 已存在 → 堆叠数+1（不超过 maxStacks），刷新持续时间
3. 不存在 → 添加新 buff（currentStacks=1）

---

## **7. 战斗流程**

**核心文件** — [internal/battle/engine.go](../xiuxian-game-server/internal/battle/engine.go)

### 完整流程

```
波次循环(最多3波) {
  回合循环(最多20回合/波) {
    速度排序 → 回合开始(念力+5, DOT/HOT, CD-1) → 逐单位行动 {
      跳过死亡/眩晕 → 被动技 → 选技能 → 释放前buff →
      伤害计算 → 反击 → 反弹 → 释放后buff → 事件触发 →
      额外行动检查 → 回合结束检查
    } → 回合结束(buff持续-1, 清过期) → 超时判B方胜
  }
} → 战斗结算
```

多波次入口是 [internal/battle/waves.go](../xiuxian-game-server/internal/battle/waves.go) 的 `ExecuteSkillBattleWaves(...)`。

### 资源经济

| 资源     | 初始 | 回合自动恢复      | 说明                         |
| -------- | ---- | ----------------- | ---------------------------- |
| HP       | 满   | 仅通过 REGEN buff | —                            |
| 灵力(MP) | 100  | **不自动恢复**    | 仅通过普攻(+20)/战技(+5)获得 |
| 念力(SP) | 100  | +5/回合           | —                            |

> ⚠️ **灵力不会每回合自动恢复**。代码中有明确注释。灵力是通过普攻和战技的行动后回复获得的。这意味着：如果一个单位只释放神通，灵力会持续消耗直到不足，只能回退到普攻来回复灵力。你不能假设灵力会自动回满。

### 速度排序

速度高优先 → 速度相同取位置小 → 位置相同取 A 方

### 波次规则

- 最多 3 波次，每波每方最多 6 单位
- 波次切换：死亡单位不复活，仅清空 buff
- 超过最大回合（20）→ B方（防守方）胜利

---

## **8. npcs系统**

### 怪物模板（`npcs` 表）

### 副本怪物（`dungeon_monsters` 表）

精确属性配置（物攻/法攻/物防/法防/HP/暴击率/暴伤/速度），绑定境界。

### 通用生成公式

```
levelMultiplier = 1 + (level - 1) × 0.1
HP=1000×m, 物攻=100×m, 物防=50×m, 法攻=80×m, 法防=40×m, 速度=80+level×2
暴击率=5%, 暴伤=150%
```

怪物构型在服务端构建，例如：
[internal/service/world_boss_configured_npc.go](../xiuxian-game-server/internal/service/world_boss_configured_npc.go)、
[internal/service/pve_service.go](../xiuxian-game-server/internal/service/pve_service.go)。

你不能修改通用生成公式而不检查所有使用同一构型的战斗场景。

---

## **9. 战斗场景**

| 场景     | 服务端实现                                                                                                                                                                                                                        | 关键特点                                                   |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 秘境     | [internal/service/pve_service.go](../xiuxian-game-server/internal/service/pve_service.go)                                                                                                                                         | 精确怪物属性, 手动/自动, 首通奖励, 道侣加成                |
| 主线     | [internal/service/storyline_service.go](../xiuxian-game-server/internal/service/storyline_service.go)                                                                                                                             | 章节制(24+章×4关), 星级评价, 扫荡                          |
| 妖塔     | [internal/service/competitive_pve_service.go](../xiuxian-game-server/internal/service/competitive_pve_service.go)                                                                                                                 | 60层×3关, 星级倍率(0.8/1.0/1.2), 层间Buff                  |
| PVP比试  | [internal/service/pvp_robbery_service.go](../xiuxian-game-server/internal/service/pvp_robbery_service.go)                                                                                                                         | 玩家vs玩家, 自动战斗                                       |
| 仙门比武 | [internal/service/guild_competition_battle.go](../xiuxian-game-server/internal/service/guild_competition_battle.go)                                                                                                               | 公会对战, 淘汰赛                                           |
| 世界凶兽 | [internal/service/world_boss_configured_npc.go](../xiuxian-game-server/internal/service/world_boss_configured_npc.go)                                                                                                             | 每日定时, 伤害排行                                         |
| 手动战斗 | [internal/battle/manual_session.go](../xiuxian-game-server/internal/battle/manual_session.go) + [internal/service/storyline_manual_battle_service.go](../xiuxian-game-server/internal/service/storyline_manual_battle_service.go) | 服务端逐次给出可选技能, 客户端只提交选择; 超时由服务端清理 |

修改战斗引擎核心逻辑时，你必须验证以上所有场景不受影响。不能只测试单一场景就认为没有问题。
服务端已有对应的对照测试（`internal/battle/*_test.go`、`internal/service/*_test.go`），改数值后必须全量跑过。

---

## **10. 战力公式**

```
战力 = floor((物攻 + 物防 + 法攻 + 法防) / 4)
```

服务端实现在 [internal/battle/power.go](../xiuxian-game-server/internal/battle/power.go) 的 `ComputePower(attrs)`。
客户端通过 `get_players_id_attribute_panel` / 战力相关查询接口读取已成算好的战力，**不要在前端重算**。
