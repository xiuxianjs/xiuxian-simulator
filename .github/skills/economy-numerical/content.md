## **1. 文件结构**

> ⚠️ **经济数值唯一的实现位置是服务端**（`../xiuxian-game-server`）。
> 客户端已删除 `src/model/**` 与 `src/db/**`：不持有余额、不写流水、不算收益、不做限购判定。
> 客户端只负责「发起请求 + 渲染服务端回执」。

### 服务端 · 经济业务

| 服务端实现                                                                                                          | 用途                    |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| [internal/service/shop_service.go](../xiuxian-game-server/internal/service/shop_service.go)                         | 统一商店（万宝楼）逻辑  |
| [internal/service/market_service.go](../xiuxian-game-server/internal/service/market_service.go)                     | 交易所（P2P 市场）      |
| [internal/service/player_shop_query.go](../xiuxian-game-server/internal/service/player_shop_query.go)               | 玩家店铺系统            |
| [internal/service/vip_privileges_query.go](../xiuxian-game-server/internal/service/vip_privileges_query.go)         | VIP 等级与特权          |
| [internal/service/first_recharge_query.go](../xiuxian-game-server/internal/service/first_recharge_query.go)         | 充值档位 / 首充         |
| [internal/service/event_recharge_query.go](../xiuxian-game-server/internal/service/event_recharge_query.go)         | 活动充值档位            |
| [internal/service/month_card_daily_rewards.go](../xiuxian-game-server/internal/service/month_card_daily_rewards.go) | 月卡每日奖励            |
| [internal/service/month_card_recovery.go](../xiuxian-game-server/internal/service/month_card_recovery.go)           | 月卡补偿                |
| [internal/service/alchemy_service.go](../xiuxian-game-server/internal/service/alchemy_service.go)                   | 炼丹（合成经济）        |
| [internal/service/equipment_service.go](../xiuxian-game-server/internal/service/equipment_service.go)               | 装备分解（`Decompose`） |
| [internal/service/lootbox_service.go](../xiuxian-game-server/internal/service/lootbox_service.go)                   | 随机礼盒                |
| [internal/service/pvp_robbery_service.go](../xiuxian-game-server/internal/service/pvp_robbery_service.go)           | 打劫系统                |
| [internal/service/guild_service.go](../xiuxian-game-server/internal/service/guild_service.go)                       | 宗门经济                |
| [internal/service/companion_service.go](../xiuxian-game-server/internal/service/companion_service.go)               | 道侣经济（同心值）      |
| [internal/service/pve_service.go](../xiuxian-game-server/internal/service/pve_service.go)                           | 副本奖励                |
| [internal/service/seclusion_service.go](../xiuxian-game-server/internal/service/seclusion_service.go)               | 闭关奖励                |
| [internal/service/world_boss_claim_all.go](../xiuxian-game-server/internal/service/world_boss_claim_all.go)         | 世界凶兽奖励            |
| [internal/service/tongtian_tower_service.go](../xiuxian-game-server/internal/service/tongtian_tower_service.go)     | 妖塔 / 通天塔积分       |

### 服务端 · 定时与补偿

| 服务端实现                                                                                | 用途                         |
| ----------------------------------------------------------------------------------------- | ---------------------------- |
| [internal/worker/economy_jobs.go](../xiuxian-game-server/internal/worker/economy_jobs.go) | 经济类周期任务               |
| [internal/worker/market_jobs.go](../xiuxian-game-server/internal/worker/market_jobs.go)   | 挂单过期、热度衰减           |
| [internal/worker/payment_jobs.go](../xiuxian-game-server/internal/worker/payment_jobs.go) | 支付补单、月卡与 VIP 对账    |
| [internal/worker/jobs.go](../xiuxian-game-server/internal/worker/jobs.go)                 | 任务注册与调度               |
| [internal/worker/ownership.go](../xiuxian-game-server/internal/worker/ownership.go)       | 每个定时任务的归属与交接闸门 |

### 客户端 · 只保留常量与展示

| 客户端文件                                                                                  | 用途                            |
| ------------------------------------------------------------------------------------------- | ------------------------------- |
| [src/constants/recharge.ts](../../../src/constants/recharge.ts)                             | 元↔道晶换算、月卡上限、新人窗口 |
| [src/constants/currency.ts](../../../src/constants/currency.ts)                             | 货币名称 / 图标映射             |
| [src/constants/marketCategories.ts](../../../src/constants/marketCategories.ts)             | 交易所分类标签                  |
| [src/constants/itemTypes.ts](../../../src/constants/itemTypes.ts)                           | 物品大类 / 子类标签             |
| [src/api/bot/sponsor-payment.ts](../../../src/api/bot/sponsor-payment.ts)                   | 下单 / 查单 / 取消接口封装      |
| [src/api/bot/shop-queries.ts](../../../src/api/bot/shop-queries.ts)                         | 商店查询接口封装                |
| [src/api/bot/vip-privileges-queries.ts](../../../src/api/bot/vip-privileges-queries.ts)     | VIP 特权查询接口封装            |
| [src/api/bot/recharge-catalog-queries.ts](../../../src/api/bot/recharge-catalog-queries.ts) | 充值目录查询接口封装            |

> ⚠️ 客户端常量只是**展示口径**；真正的限购、折扣、手续费、概率判定全在服务端。
> 两边数值必须一致，但不允许客户端拿这些常量去做判定。
> 客户端的 `src/constants/**` 里**没有** VIP 阈值常量：VIP 等级与折扣一律由服务端返回。

### 已不存在的系统

**千机阁（拍卖）在当前代码库中没有实现**：服务端没有对应的 service 与接口，客户端也没有对应指令或页面。
历史文档里的拍卖数值（超时 120 秒、最低加价 10% 等）只作为设计史料保留，**不能据此实现代码**；
如果要做拍卖，需要先在服务端 `internal/service/**` 补齐规则与接口，并同步 `docs/openapi.yaml`。

---

## **2. 货币体系**

### 七种货币

| 货币   | 用途           | 主要来源                | 主要消耗          |
| ------ | -------------- | ----------------------- | ----------------- |
| 灵石   | 基础通用货币   | 副本/闭关/打劫/宗门俸禄 | 万宝楼/宗门捐献   |
| 灵晶   | 交易所结算货币 | 副本首通/月卡           | 交易所/万宝楼     |
| 道晶   | 付费货币       | 充值/月卡               | 神奇商店/特殊道具 |
| 声望   | 声望商店货币   | 声望任务                | 声望商店          |
| 签到币 | 签到商店货币   | 每日签到                | 签到商店          |
| 积分   | 积分商店货币   | 妖塔里程碑              | 积分商店          |
| 同心值 | 道侣商店货币   | 道侣互动                | 道侣商店          |

### 道晶换算

```
1 元 = 10 道晶
道晶 = 支付金额(分) / 10
```

你不能修改此换算比例。这是真实付费挂钩的核心常量，修改会直接影响所有付费定价。
换算落在服务端的支付结算链路（`internal/service/` 支付相关 service + `internal/worker/payment_jobs.go`）。

### 数据存储

- **余额**：玩家的货币字段由服务端与共享 DB SDK（`github.com/xiuxianjs/xiuxian-game-db-sdk/gamemodels`）持有
- **流水**：所有货币增减都必须带业务原因写入流水，供对账使用
- **客户端不直连数据库**：读余额走接口，写余额走服务端事务

---

## **3. 统一商店系统（万宝楼）**

**核心实现** — [internal/service/shop_service.go](../xiuxian-game-server/internal/service/shop_service.go)

### 六个子商店

| shopCode  | 名称     | 主货币         |
| --------- | -------- | -------------- |
| wanbaolou | 万宝楼   | 灵石/灵晶/道晶 |
| shenqi    | 神奇商店 | 道晶           |
| shengwang | 声望商店 | 声望           |
| qiandao   | 签到商店 | 签到币         |
| jifen     | 积分商店 | 积分           |
| daolv     | 道侣商店 | 同心值         |

### 限购机制

商品配置字段：`purchaseLimit` / `purchaseLimitType` / `purchaseResetCycle`

- 限购周期：日/周/月/永久
- 限购数量：从商品配置表读取
- **判定发生在服务端**，客户端只展示剩余次数

### VIP 丹药限购加成

```
实际限购 = 基础限购 + VIP等级
```

- VIP 0 → 限购 6 次，VIP 9 → 限购 15 次
- 仅影响 itemId=38（精力丹）和 itemId=39（元力丹）

### 月卡限购加成

```
额外限购 = +2
```

与 VIP 加成叠加。

### VIP 神奇商店折扣

| VIP 等级 | 折扣率       |
| -------- | ------------ |
| VIP 3+   | 0.98（98折） |
| VIP 5+   | 0.97（97折） |
| VIP 7+   | 0.96（96折） |
| VIP 9    | 0.95（95折） |

你不能修改折扣率而不同时检查高 VIP 玩家通过折扣大量囤货后在交易所倒卖是否会破坏经济平衡。

### 双币种定价

商品支持主币种（`priceCurrencyCode`）+ 副币种（`secondaryPrice`），两种币种均扣除。

---

## **4. 交易所（P2P 市场）**

**核心实现** — [internal/service/market_service.go](../xiuxian-game-server/internal/service/market_service.go)；
挂单过期为 [internal/worker/market_jobs.go](../xiuxian-game-server/internal/worker/market_jobs.go)

### 核心常量

| 参数       | 值       | 说明                        |
| ---------- | -------- | --------------------------- |
| 最大上架数 | **3**    | 每人最多 3 件上架中物品     |
| 最低价比例 | **50%**  | 最低售价 = basePrice × 50%  |
| 最高价比例 | **800%** | 最高售价 = basePrice × 800% |
| 结算货币   | **灵晶** | 唯一结算货币                |

### 手续费

```
默认费率 = 0.05（5%）
实际费率 = clamp(系统配置值, 0, 0.2)
卖家实收 = 售价 - floor(售价 × 费率)
```

- 费率来自服务端系统配置
- 钳位范围：0% ~ 20%

你不能修改费率范围上限（20%）而不验证极端情况下卖家收益是否合理。5% 是平衡点，偏离过多会抑制交易活跃度。

### 物品交易权限

权限位掩码：`TRADE = 1`, `MARKET = 2`, `AUCTION = 4`

- 可交易 = `(permission & MARKET) !== 0`
- 不是所有物品都可上架，服务端会检查 `items` 表的权限位
- 客户端不持有权限位定义，可交易性以接口返回的 `canSell` / `sellable` 之类结论为准

### 分类

丹药/礼物/本命物/矿石/草药/经验材料/装备/功法

---

## **~~5. 千机阁（拍卖系统）~~**

> ⚠️ **该玩法当前未实现**：服务端没有拍卖 service / 接口，客户端没有对应指令。
> 下面这段是历史设计记录，保留供参考；**实现前必须先在服务端落地规则与接口**。
> 不要照此在客户端写任何判定逻辑。

### 历史设计参数

| 参数           | 值                           |
| -------------- | ---------------------------- |
| 超时时间       | **120 秒**（无新出价则结束） |
| 最低加价比例   | **10%**                      |
| 结算货币       | **灵石**                     |
| 每次刷新物品数 | 最多 **9 件**                |
| 刷新时间       | **每周日 20:00**             |

```
最低出价 = Math.ceil(当前价 × 1.1)
```

状态流：`PENDING(0) → ONGOING(1) → SOLD(2) / EXPIRED / CANCELLED`

你不能修改超时时间（120s）而不考虑对拍卖体验的影响 — 太短导致来不及竞价，太长导致拍卖拖沓。

---

## **6. 玩家店铺系统**

**核心实现** — [internal/service/player_shop_query.go](../xiuxian-game-server/internal/service/player_shop_query.go)、
[internal/service/player_shop_ranking_query.go](../xiuxian-game-server/internal/service/player_shop_ranking_query.go)

### 店铺等级

| 等级 | 名称     | 最低热度 |
| ---- | -------- | -------- |
| 1    | 摆摊小贩 | 0        |
| 2    | 杂货铺子 | 100      |
| 3    | 良品商号 | 500      |
| 4    | 精品宝阁 | 2000     |
| 5    | 传奇仙铺 | 10000    |

### 热度机制

| 行为             | 热度变化           |
| ---------------- | ------------------ |
| 上架物品         | **+2**             |
| 成交             | **+10**            |
| 每成交 1000 灵晶 | 额外 **+1**        |
| 每日自然衰减     | **-2%**（最少 -1） |

```
HEAT_DAILY_DECAY_RATE = 0.02
```

衰减由 [internal/worker/market_jobs.go](../xiuxian-game-server/internal/worker/market_jobs.go) 的每日热度衰减任务执行。
你不能修改热度衰减率而不验证 5 级店铺（10000 热度）维持等级需要的日活跃交易量是否合理。

---

## **7. VIP 与充值系统**

### VIP 等级阈值

**唯一口径** — 服务端 [internal/service/vip_privileges_query.go](../xiuxian-game-server/internal/service/vip_privileges_query.go) 与
[internal/worker/payment_jobs.go](../xiuxian-game-server/internal/worker/payment_jobs.go) 的 VIP 对账；
客户端不保留 VIP 阈值常量，界面上的等级与折扣来自接口返回

| VIP      | 0   | 1   | 2   | 3   | 4   | 5   | 6    | 7    | 8    | 9     |
| -------- | --- | --- | --- | --- | --- | --- | ---- | ---- | ---- | ----- |
| 阈值(元) | 0   | 6   | 30  | 128 | 328 | 648 | 1280 | 3280 | 6480 | 12800 |

阈值为**累计充值金额**（元），不是单笔。最高等级 VIP 9。

你不能修改 VIP 阈值而不同步检查所有读取 VIP 等级的下游（折扣/限购/签到双倍日/闭关卡等）。

### VIP 签到币双倍日

| VIP 等级 | 双倍日         |
| -------- | -------------- |
| VIP 2+   | 每月 4、5 号   |
| VIP 4+   | 每月 11、12 号 |
| VIP 6+   | 每月 18、19 号 |
| VIP 8+   | 每月 25、26 号 |

### 充值核心流程

**服务端实现** — 支付相关 service + [internal/worker/payment_jobs.go](../xiuxian-game-server/internal/worker/payment_jobs.go)

处理顺序（严格有序，不可打乱）：

1. 计算基础道晶：`Math.floor(amount / 10)`
2. VIP 升级检查（分→元后对比阈值）
3. 双倍充值检查
4. 世界充值人数统计（首次充值时）
5. 里程碑解锁
6. 新人狂欢处理
7. 限时活动充值进度推进

你不能修改充值流程顺序或在中间插入新逻辑而不理解每一步的依赖关系。
客户端侧只做三件事：下单、展示二维码/收银台、轮询查单；**回调验签是服务器到服务器，机器人不参与**。

### 月卡

**服务端** — [internal/service/month_card_daily_rewards.go](../xiuxian-game-server/internal/service/month_card_daily_rewards.go)、
[internal/service/month_card_recovery.go](../xiuxian-game-server/internal/service/month_card_recovery.go)

**即时奖励**：

| 道晶 | 灵晶 | 精力丹(38) | 元力丹(39) |
| ---- | ---- | ---------- | ---------- |
| ×30  | ×150 | ×15        | ×15        |

**每日奖励**：

| 灵晶 | 精力丹 | 元力丹 |
| ---- | ------ | ------ |
| ×15  | ×2     | ×2     |

**特权**：

- 经验加成：**+10%**
- 丹药限购加成：**+2**

**累计上限**：最多 180 天

### 双倍充值

- 服务端读取启用档位
- 每档只可领取一次（幂等检查）
- 额外道晶 = 等额基础道晶

### 礼包

- 按**单笔金额**判断解锁档位（非累计）
- 支持发放：道晶、灵晶、灵石、物品、装备、功法

### 新人狂欢

- 窗口期：注册后 **14 天**
- 内容天数：**7 天**签到
- 每日最低充值门槛：**30 元**（3000 分）
- 奖励从服务端配置读取

### 闭关卡

- 累计上限 **180 天**
- 价格 **9.9 元/月**
- 允许超过 72h 的闭关选项（96h/120h）

---

## **8. 副本奖励经济**

**核心实现** — [internal/service/pve_service.go](../xiuxian-game-server/internal/service/pve_service.go)

### 首通奖励表

| 副本ID | 名称     | 灵晶  | 灵石   | 功法ID |
| ------ | -------- | ----- | ------ | ------ |
| 1      | 桃花镇   | 30    | 500    | 3      |
| 2      | 鳌山书院 | 50    | 800    | 12     |
| 3      | 万毒谷   | 80    | 1,000  | 15     |
| 4      | 金銮殿   | 120   | 1,500  | 30     |
| 5      | 天元秘境 | 200   | 2,500  | 35     |
| 6      | 九幽魔渊 | 300   | 4,000  | 50     |
| 7      | 万妖冢   | 500   | 6,000  | 55     |
| 8      | 仙灵幻境 | 800   | 10,000 | 65     |
| 9      | 太虚天宫 | 1,200 | 16,000 | 70     |
| 10     | 混沌深渊 | 2,000 | 25,000 | 80     |
| 11     | 鸿蒙道场 | 3,500 | 40,000 | 85     |
| 12     | 血色禁地 | 40    | 600    | —      |

### 掉落系统

- 掉落配置在服务端读取
- 概率单位：**万分比**
- 分类：丹药 / 材料 / 装备 / 功法

你不能修改首通奖励的灵晶/灵石数值而不检查与整体经济节奏的匹配（越后期副本越高，是递增曲线设计）。

---

## **9. 闭关奖励经济**

**核心实现** — [internal/service/seclusion_service.go](../xiuxian-game-server/internal/service/seclusion_service.go)、
[internal/service/seclusion_experience_settlement.go](../xiuxian-game-server/internal/service/seclusion_experience_settlement.go)

### 固定奖励（完整闭关）

| 时长(h) | 灵石  | 精力丹 | 元力丹 |
| ------- | ----- | ------ | ------ |
| 48      | 300   | 3      | 3      |
| 72      | 500   | 5      | 5      |
| 96      | 750   | 7      | 7      |
| 120     | 1,000 | 10     | 10     |

### 每 12h 块基础奖励

灵石 **75**、精力丹 **1**、元力丹 **1**

### 提前出关收益率

| 已完成时间          | 收益率         |
| ------------------- | -------------- |
| < 12h               | 0%（退还精力） |
| 12h ~ 35h（1~2 块） | **35%**        |
| ≥ 36h（3+ 块）      | **100%**       |

### 稀有掉落（每 12h 判定一次）

| 物品ID | 名称         | 基础概率 |
| ------ | ------------ | -------- |
| 70     | 筑灵石       | **8%**   |
| 73     | 低级功法残页 | **5%**   |
| 74     | 中级功法残页 | **2%**   |
| 43     | 真灵丹       | **10%**  |

### 闭关卡加成

- 固定奖励倍率：**×1.2**
- 稀有掉落概率倍率：**×1.7**

你不能修改稀有掉落概率而不验证 120h 闭关（10 个 12h 块）的期望产出是否过高。例如真灵丹 10% × 10 块 = 期望 1 个/次，这是设计意图。

---

## **10. 炼丹系统经济**

**核心实现** — [internal/service/alchemy_service.go](../xiuxian-game-server/internal/service/alchemy_service.go)、
[internal/service/alchemy_manual_service.go](../xiuxian-game-server/internal/service/alchemy_manual_service.go)

### 成功率公式

```
总分 = A × 0.3 + B × 0.2 + C × 0.3 + D × 0.2
```

| 因子          | 含义                                 | 取值 |
| ------------- | ------------------------------------ | ---- |
| A（火焰品级） | 0.20（无装备），+0.16/阶，5阶+ = 1.0 |
| B（等级差值） | 差≥3→1.0, 差=2→0.5, 其他→0.2         |
| C（丹炉品级） | 同 A 公式                            |
| D（时机精度） | 误差≤range→1.0, ≤2倍→0.4, >2倍→0.2   |

### 品质判定

- `总分 < 0.44` → **失败**
- `0.44 ≤ 总分 < 0.6` → **次品**
- `总分 ≥ 0.6` + D=1.0 → **完美**；否则 **正品**

### 研习值（仅完美品质获得）

| 配方品级 | 1-2品 | 3-4品 | 5品 | 6品 | 7-9品 |
| -------- | ----- | ----- | --- | --- | ----- |
| 研习值   | 10    | 15    | 20  | 25  | 25    |

### 自动炼丹

| 配方品级 | 完美率       | 次品率 | 失败率 |
| -------- | ------------ | ------ | ------ |
| 1-2品    | 90%          | 8%     | 2%     |
| 3-4品    | 85%          | 10%    | 5%     |
| 5品+     | **不可自动** | —      | —      |

- 最大批次：**10**
- 解锁门槛：研习值 ≥ **100**
- 经验限制：职业等级 - 配方等级 > 2 时不获得经验

你不能修改自动炼丹的 90%/85% 完美率而不考虑这对高品级丹药市场供给的影响。

---

## **11. 装备分解经济**

**核心实现** — [internal/service/equipment_service.go](../xiuxian-game-server/internal/service/equipment_service.go) 的分解逻辑

### 产出

| 品级         | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   |
| ------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 矿石精华(72) | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   |

线性关系：`产出数量 = 装备品级`

---

## **12. 打劫系统**

**核心实现** — [internal/service/pvp_robbery_service.go](../xiuxian-game-server/internal/service/pvp_robbery_service.go)

| 参数                 | 值       |
| -------------------- | -------- |
| 元力消耗             | **15**   |
| 每日上限             | **5 次** |
| 单目标每日被打劫上限 | **3 次** |
| 胜利灵晶奖励         | **10**   |
| 煞气变化值           | **±1**   |

---

## **13. 道侣系统经济**

**核心实现** — [internal/service/companion_service.go](../xiuxian-game-server/internal/service/companion_service.go)

### 同心值获取

| 活动                | 同心值  | 每日上限 |
| ------------------- | ------- | -------- |
| 双修                | **+5**  | 1 次/日  |
| 同行秘境            | **+2**  | 5 次/日  |
| 赠送礼物（第 1 次） | **+5**  | 2 次/日  |
| 赠送礼物（第 2 次） | **+10** | —        |

### 双修经验

| 灵契等级  | 经验  |
| --------- | ----- |
| 知交/共修 | 0     |
| 同心      | 200   |
| 玄缘      | 500   |
| 星宿      | 1,000 |
| 天道同心  | 2,000 |

### 道侣秘境祝福（属性加成%）

| 灵契等级 | 普通秘境 | 高级秘境 |
| -------- | -------- | -------- |
| 同心     | +2%      | +4%      |
| 玄缘     | +3%      | +5%      |
| 星宿     | +4%      | +6%      |
| 天道同心 | +5%      | +7%      |

---

## **14. 宗门经济**

**核心实现** — [internal/service/guild_service.go](../xiuxian-game-server/internal/service/guild_service.go)、
[internal/service/guild_shop_auto_refresh.go](../xiuxian-game-server/internal/service/guild_shop_auto_refresh.go)

| 参数                 | 值                          |
| -------------------- | --------------------------- |
| 创建宗门消耗         | **100 灵石**                |
| 每日商店刷新次数     | **最多 3 次**               |
| 刷新消耗（宗门灵石） | 500 / 1,000 / 2,000（递增） |

- 俸禄：按职位从宗门职位配置读取
- 商品兑换：消耗个人**贡献值**，配置在宗门商店目录里

---

## **15. 随机礼盒**

**核心实现** — [internal/service/lootbox_service.go](../xiuxian-game-server/internal/service/lootbox_service.go)

- 奖池配置在服务端读取
- 抽取算法：加权随机（累加权重 → 区间随机定位）
- 支持不重复抽取模式
- 奖励类型：货币/物品/装备/功法
- 客户端只提交开启请求并渲染服务端结果

---

## **16. 世界凶兽**

**核心实现** — [internal/service/world_boss_claim_all.go](../xiuxian-game-server/internal/service/world_boss_claim_all.go)、
[internal/service/world_boss_rewards_query.go](../xiuxian-game-server/internal/service/world_boss_rewards_query.go)

| 参数         | 值                   |
| ------------ | -------------------- |
| 开放时间     | 每日 **12:00-14:00** |
| 每日挑战次数 | **5 次**             |
| 奖励过期     | **6 天**             |

奖励按伤害占比分档，配置在服务端。

---

## **17. 地图探索经济**

| 参数         | 值                          |
| ------------ | --------------------------- |
| 移动消耗     | **2 体力**                  |
| 采集消耗     | **5 精力**                  |
| 采集冷却     | **3,600 秒**                |
| 怪物遭遇概率 | 普通 **25%** / 精英 **45%** |
| 战败惩罚     | **5 体力**                  |

> ⚠️ 地图探索在当前客户端没有独立指令入口，本节数值作为服务端规则记录。

---

## **18. 经济流向总图**

```
充值 ──→ 道晶 ──→ 神奇商店 ──→ 稀有道具
       └→ 月卡 ──→ 灵晶(每日) + 经验加成

副本 ──→ 灵石 + 灵晶(首通) + 掉落物品
闭关 ──→ 灵石 + 精力丹 + 元力丹 + 稀有掉落
打劫 ──→ 灵晶(10/次)

灵石 ──→ 万宝楼 / 宗门捐献 / 创建宗门
灵晶 ──→ 交易所(唯一结算) / 万宝楼
道晶 ──→ 神奇商店(VIP折扣)
声望 ──→ 声望商店
签到币 ──→ 签到商店(VIP双倍日)
积分 ──→ 积分商店
同心值 ──→ 道侣商店

交易所 ──→ 5%手续费(灵晶沉没)
玩家店铺 ──→ 热度驱动的等级体系
```

所有货币增减都由服务端在事务内完成并写流水。你修改任何产出/消耗环节时，必须理解它在整个经济流向中的位置，避免引入单向通胀（只产出无消耗）或通缩（只消耗无产出）。
