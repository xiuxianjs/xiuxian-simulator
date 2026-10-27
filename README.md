# 修仙机器人

本项目是基于 AlemonJS 的修仙文字消息游戏机器人。机器人接收聊天平台指令，处理交互与气泡排版，并通过 HTTP API 向 游戏服务查询和提交操作；游戏规则、状态变更与结算以服务端为准。

## 安装

> 安装后使用 `/帮助` 唤醒

地址

```sh
https://github.com/xiuxianjs/xiuxian-game.git
```

分支

```sh
release
```

## 代码结构

- `src/router.ts`：指令路由及中间件。
- `src/response`：指令入口和消息气泡；`src/response-apps`：按玩法组织的交互处理。
- `src/api`：Go 服务的 HTTP 契约、客户端和机器人调用适配。
- `src/notification`：聊天平台通知投递、权限与回执处理。
- `src/task`：现有任务触发器及调度归属校验。
- alemon.config.example.yaml 机器人配置说明

### AI 插件能力（Expose）

机器人提供协议 `xiuxian.player.v1`，provider 为实际加载名（通常是 `xiuxian-game`）。当前能力版本为 `1.14.0`，已注册 109 项能力（31 项查询及 78 项经业务入口调用的动作），仅使用当前消息玩家身份，不发送聊天消息。

| 动作                   | 参数                                                                  | 返回内容                                                           |
| ---------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `get_attributes`       | `{}`                                                                  | UID、道号、境界名称、五维属性及上限、战斗属性；数值单位沿用服务端  |
| `get_inventory`        | `{ category: 'prop' 或 'material', page?: number, subtype?: string }` | 道具／材料背包、服务端分页、库存和挂牌数量、锁定状态及可用入口     |
| `get_battle_templates` | `{}`                                                                  | 当前配装与已保存模板、装备名称、功法槽位及名称、缺失装备／功法数量 |

新增的常用查询如下；未列参数的动作传 `{}`，分页默认第 1 页。

| 范围         | 动作                                              | 可选参数／说明                            |
| ------------ | ------------------------------------------------- | ----------------------------------------- |
| 资料与境界   | `get_profile`、`get_realm`                        | 当前资源、境界、突破与晋升条件            |
| 灵根         | `get_spirit_root`、`get_spirit_root_materials`    | 品质、培养材料及来源                      |
| 经脉与神魂   | `get_meridians`、`get_soul_path`                  | 进度、剩余次数、材料与节点条件            |
| 当前装备     | `get_equipped`                                    | 已装备物品与空槽位                        |
| 已学功法     | `get_learned_books`                               | `page`、`visibility: visible/hidden`      |
| 装备背包     | `get_equipment_bag`                               | `page`、`equipmentType`                   |
| 功法背包     | `get_skill_book_bag`                              | `page`、`skillType`                       |
| 本命物、礼盒 | `get_soul_artifact_bag`、`get_lootboxes`          | `page`                                    |
| 天工工具     | `get_profession_tool_bag`                         | `page`、`typeName`                        |
| 主线         | `get_storyline_chapters`、`get_storyline_chapter` | 前者可传 `page`；后者必传 `chapterNumber` |
| 副本、凶兽   | `get_dungeons`、`get_world_boss`                  | 副本可传 `page`                           |
| 日常与任务   | `get_checkin_status`、`get_tasks`                 | 签到时段、任务状态及提示入口              |
| 邮件         | `get_emails`                                      | `page`；不领取附件或删除邮件              |
| 洞府与宗门   | `get_cave`、`get_guild`                           | 灵田、阵法、宗门状态                      |
| 商店         | `get_shop_products`                               | `page`、`shopCode`                        |

新增查询暂标 `effect: unknown`，不能仅凭 GET 或“查询”名称推断无副作用。已确认神魂查询会由服务端初始化状态和发放教学材料；其他入口的副作用分类仍在逐项核查。可选字段缺失表示服务端未提供或原值为 null，不补造零值；超出安全整数范围的整数字段拒绝返回。返回的聊天命令与操作资格仅供展示，不代表 Expose 已开放相应写操作。

背包页码默认 1；省略 subtype 时服务端分别使用道具 `pill`、材料 `herb`，不是所有子分类的合计。使用返回的 `pagination` 翻页；空页保留服务端总量，不补造物品。`lockState` 保留服务端数值，布尔状态转换为 0/1；库存和挂牌数量不等同于可消耗数量。此动作仅覆盖道具和材料；装备、功法、本命物、天工和礼盒使用各自独立动作。无固定结构的物品 effect 不直接透传。

战斗模板功法表示为 `skills: [{ slot, name }]`，保留服务端槽位名称；境界不足、接口拒绝或响应不完整均返回失败，不伪装成空模板。

默认开启，无需配置即可由框架识别的插件在当前 QQ 消息中调用。在 `xiuxian-game` 下可关闭或限制调用方：

```yaml
expose:
  enabled: true # false 关闭全部 Expose 调用
  # 可选；不配置允许框架识别的插件，空数组拒绝全部调用
  # allowed_callers: ['你的AI插件实际加载名']
```

可信 AI 插件在自己的 QQ 消息处理器中按动作契约调用，例如：

```ts
import { Expose } from 'alemonjs';

const result = await Expose.create().call('xiuxian.player.v1', 'xiuxian-game', 'get_attributes', {}, { timeoutMs: 10000 });
if (result.ok) {
  // 将 result.data 作为工具结果；不要假设其他动作具有相同输出。
} else {
  // 按 result.error.code 处理拒绝、取消、后端失败等情况。
}
```

调用者须由框架识别，模型不能指定调用方或目标 UID。只允许当前 QQ 消息事件，不支持定时后台代玩或按钮事件；本包 `events` 开关和渠道机器人身份校验同样生效。每次查询重新向服务端解析当前绑定角色，不使用事件附加的 UID；服务端继续校验接口归属。参数与输出均由 Expose 契约校验。身份与业务查询 HTTP 请求均接收取消信号。

默认信任宿主加载的插件，也可使用白名单收紧调用范围；调用插件应在玩家明确要求时调用，不应把私人属性转发到其他会话。同进程插件不是沙箱，此机制也不提供玩家长期委托授权。当前已开放以下签到、邮件领取、修炼、战斗模板、装备穿戴、功法显示与礼盒操作；其他物品消耗和交易确认操作仍在接入，后续须接入服务端确认引用、原操作编号与幂等结算，不能直接把任意聊天指令作为工具执行。

### Expose 写操作

| 动作               | 参数                  | 结果                                |
| ------------------ | --------------------- | ----------------------------------- |
| `checkin_daily`    | `{}`                  | 日常签到奖励和累计进度              |
| `checkin_newcomer` | `{}`                  | 新人签到奖励及到期日期              |
| `checkin_all`      | `{}`                  | 各项签到的 done / skip / error 回执 |
| `claim_email`      | `{ emailId: number }` | 指定邮件领取回执                    |
| `claim_all_emails` | `{}`                  | 领取、跳过、总数                    |

这些动作标记 `effect: write`，使用同一个默认开启、可关闭及调用方白名单配置。仅接受当前真实平台消息身份，必须有消息编号；不能传入 UID、业务操作名、URL 或任意聊天指令。调用服务端 V2 业务入口，保留准入、维护及游戏资格校验，不发送聊天消息、不消费任务续接上下文。

返回 `{ success, branch, reason, replies, result? }`。Expose 的 `ok` 只表示调用及响应契约成功，业务拒绝仍可返回 `ok: true`；调用方必须检查 `success`、`branch` 和具体结果。一键签到须逐项检查状态。`replies` 保留服务端拒绝提示及按钮，不自动执行按钮。

幂等键绑定原消息、固定业务操作与排序后的参数，同一消息内同参重试复用原键；新消息不是原操作重试。取消或错误的 `outcome: unknown` 不代表服务端回滚，禁止换新消息自动重试领取。框架 callId 不是结算幂等编号。

### Expose 修炼与战斗模板

| 动作                           | 参数                              | 结果及边界                                           |
| ------------------------------ | --------------------------------- | ---------------------------------------------------- |
| `get_meditation_boost_options` | `{}`                              | 自动加速设置、倍率、每周期灵石价格、周期分钟数和余额 |
| `start_meditation`             | `{}`                              | 开始闭关或返回已有进度；检查 `result.success`        |
| `end_meditation`               | `{}`                              | 出关、实际收益及费用结算；检查 `result.success`      |
| `pulse_meridian`               | `{}`                              | 单次冲脉进度、剩余真气、次数及后续资格               |
| `breakthrough_realm`           | `{}`                              | 突破后的境界、解锁及师门提示                         |
| `save_battle_template`         | `{ slot: number, name?: string }` | 保存当前配装，已有槽位会覆盖，返回实际保存名称       |
| `apply_battle_template`        | `{ slot: number }`                | 切换当前配装，返回实际装备和功法                     |
| `delete_battle_template`       | `{ slot: number }`                | 删除模板记录；不分解物品                             |

模板槽位限定 1..5，功法沿用查询的 `skills: [{ slot, name }]`。这些动作均沿用写操作回执、身份和幂等约束；加速设置查询经过业务准入，保守标记 `effect: write`，不承诺没有资源结算副作用。

普通闭关遵循已有自动加速配置，出关可能消耗灵石；调用前可查询加速设置，本入口不修改设置或购买旧版按小时加速。收益、消耗、周期均来自服务端，不在机器人重算。冲脉返回的 `Progress`、`RequiredProgress` 和配置沿用服务端字段。

### Expose 装备、功法与礼盒

| 动作                   | 参数                                          | 说明                                                               |
| ---------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| `equip_equipment`      | `{ identifier: string }`                      | 装备实例编号字符串或名称；优先使用背包中的实例编号                 |
| `auto_equip_equipment` | `{}`                                          | 服务端自动穿戴；逐项检查 `results`，可能部分未装备                 |
| `unequip_equipment`    | `{ equipmentTypeName: string }`               | 按当前装备类型名称卸下                                             |
| `unequip_skill_book`   | `{ skillType: '战技' 或 '被动技' 或 '神通' }` | 换下当前功法，不遗忘或分解                                         |
| `hide_skill_book`      | `{ bookId: number }`                          | 隐藏本人已学功法，使用实例编号                                     |
| `show_skill_book`      | `{ bookId: number }`                          | 恢复显示隐藏功法                                                   |
| `open_lootbox`         | `{ lootboxName: string, openCount: number }`  | 名称或配置编号字符串；数量为 1..10，库存不足时实际数量由服务端返回 |

这些动作使用现有服务端业务准入、所有权及幂等校验。`success: false` 也可能来自写入之后的缓存失败，不能推断完全未修改；应核对状态和原回执，不能换新消息自动重试。礼盒会消耗库存，奖励以回执为准，不预估随机产出。

功法学习与切换的覆盖确认尚未开放；不提供可绕过预览的任意 `force` 参数。

### Expose 凶兽与妖塔

| 动作                       | 参数                                                     | 结果及边界                                                     |
| -------------------------- | -------------------------------------------------------- | -------------------------------------------------------------- |
| `challenge_world_boss`     | `{}`                                                     | 挑战一次；伤害、剩余次数、战斗摘要及 logId                     |
| `challenge_world_boss_all` | `{}`                                                     | 使用剩余次数；逐场回执、实际消耗次数及中止原因                 |
| `claim_world_boss_rewards` | `{}`                                                     | 实际领取条目、灵石与灵晶合计                                   |
| `get_demon_tower`          | `{}`                                                     | 当前层、历史星数、加成、待选次数、操作资格；每次重新读取       |
| `challenge_demon_tower`    | `{ stars: number }`                                      | 1..3 星挑战；检查 result.success、layerCleared、needSelectBuff |
| `select_demon_tower_buff`  | `{ buffKey: 'hp' 或 'atk' 或 'critDmg', count: number }` | 消耗可选次数，返回实际加成及剩余次数                           |
| `sweep_demon_tower`        | `{}`                                                     | 实际扫荡层数、灵石、积分、里程碑和待选加成                     |
| `reset_demon_tower`        | `{}`                                                     | 重置当前进度，服务端校验次数并消耗重列旗                       |

批量挑战可能只完成部分场次；以 rounds、attemptsUsed、remainingAttempts 和 stopReason 为准。挑战失败、战斗落败、资格拒绝分别保留原结果，不自动再次发起挑战。战斗记录编号原样返回；Expose 不发送回放链接或执行聊天路由。所有收益及消耗由服务端结算，取消调用不保证回滚。

### Expose 主线宝箱与秘境

| 动作                             | 参数                                                            | 结果及边界                                                 |
| -------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| `challenge_dungeon`              | `{ dungeonName: string }`                                       | 秘境挑战；检查 won 及 rewardsByUser 中各成员实际资格与奖励 |
| `sweep_dungeon`                  | `{ dungeonName: string, times: number }`                        | 次数仅支持 1、5、10；实际精力消耗、货币及物品明细          |
| `sweep_free_dungeons`            | `{}`                                                            | 免费秘境扫荡；返回实际完成与跳过项目，不自动重试           |
| `sweep_storyline`                | `{ chapterNumber: number, stageNumber: number, times: number }` | 关卡 1..4、次数 1..9999，返回实际消耗和奖励                |
| `claim_storyline_chest`          | `{ chapterNumber: number, chestIndex: number }`                 | 领取指定章节宝箱；序号取章节查询结果                       |
| `claim_storyline_chapter_chests` | `{ chapterNumber: number }`                                     | 领取指定章节所有可领宝箱                                   |
| `claim_all_storyline_chests`     | `{}`                                                            | 领取全部章节可领宝箱，返回章节明细与合计                   |

主线扫荡的 `totalExp` 和 `totalBonusExp` 分别保留基础修为与有符号调整，最终修为按两者相加理解；封顶可能使调整为负。秘境组队胜利不代表所有成员都获得奖励，以 `rewardsByUser` 的 eligible、noRewardReason、spiritCostPaid 及实际奖励为准。

动作沿用当前消息身份、服务端准入及稳定幂等键，不把调用方自由文本作为任意业务命令。主线扫荡与宝箱所需 input 由限定的结构化参数构造。主线手动战斗使用下列带版本校验的能力；其他预览确认能力仍在接入中。

### Expose 主线手动战斗

| 动作                     | 参数                                                              | 说明                                                              |
| ------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| `challenge_storyline`    | `{ chapterNumber: number, stageNumber: number }`                  | 关卡 1..4；遵循玩家原有自动／手动模式，返回战斗状态或结算         |
| `get_storyline_battle`   | `{ sessionId: string }`                                           | 每次重新读取本人会话，不推进回合                                  |
| `choose_storyline_skill` | `{ sessionId: string, expectedRevision: number, choice: string }` | choice 为 normal、battle、divine、自动；使用最近状态中的 revision |

流程为挑战后检查 finished；有 choice 时读取 availableSkills 和当前阵容，再提交 expectedRevision。必须检查 `choiceAccepted`：true 表示本次提交已接受；false 表示未按本次输入执行选技，返回当前状态供重新决策。版本过期、已结束或选择期限已过时，不把原选择套用到后续回合。可用技能、选择期限、Worker 超时处理和结算均由服务端决定。

同一消息、会话、版本和技能重试复用同一幂等键；连续回合使用服务端返回的新 revision，因此同一消息内多次选择普攻也能推进。revision 是状态版本，不是所有权凭据；服务端仍校验会话玩家。`自动` 表示交由原有自动战斗逻辑完成当前会话。

回执包含当前阵容、技能选项、行动摘要、战斗记录编号及收益结算；只投影业务所需字段，不返回底层玩家模型或随机种子。先发布配套服务端 revision / expectedRevision 支持，再发布机器人；旧服务端缺少版本回执时会明确失败，不能自动降级为无版本选技。新服务端继续兼容原聊天处理器的无 expectedRevision 请求。

### Expose 洞府与宗门日常

| 动作                     | 参数                                      | 说明                                                |
| ------------------------ | ----------------------------------------- | --------------------------------------------------- |
| `get_cave_plant_options` | `{ plotIndex?: number }`                  | 可播种灵种、库存、成熟小时数与空闲地块              |
| `cultivate_cave_plot`    | `{ plotIndex: number }`                   | 开垦指定地块；服务端校验材料和资格                  |
| `plant_cave_seed`        | `{ plotIndex: number, seedName: string }` | 消耗对应灵种播种                                    |
| `water_cave_plots`       | `{ plotIndex?: number }`                  | 浇灌；省略地块则批量处理                            |
| `remove_cave_worms`      | `{ plotIndex?: number }`                  | 除虫；省略地块则批量处理                            |
| `remove_cave_weeds`      | `{ plotIndex?: number }`                  | 除草；省略地块则批量处理                            |
| `harvest_cave_plots`     | `{ plotIndex?: number }`                  | 收割；以服务端实际成熟及收获状态为准                |
| `tend_cave_plots`        | `{}`                                      | 一键照料并收割本人灵田，检查各步骤说明              |
| `checkin_guild`          | `{}`                                      | 当前宗门签到，返回实际贡献、声望和活跃增量          |
| `mine_guild`             | `{}`                                      | 开始、查看进行中或结算采矿；检查 outcome 和剩余秒数 |
| `claim_guild_stipend`    | `{}`                                      | 领取本周俸禄，返回实际金额及倍率事实                |

洞府操作返回 message、needsSeedSelection 以及可用的 overview / options。snapshotError 表示快照读取失败，不能推断此前操作未发生；一键打理可能部分完成，以 message 各步骤为准。查询播种选项不消耗种子，实际播种和开垦使用服务端库存与规则。

宗门操作保留 message 和结构化 receipt。采矿回执可包含 baseSpiritStone、spiritStoneBonus、outputMultiplier；旧服务端未提供时省略，不补造零值。产出、成长周期、俸禄倍率均来自服务端，不在机器人重算。

### Expose 炼丹与锻造确认

| 动作                     | 参数                                  | 说明                                     |
| ------------------------ | ------------------------------------- | ---------------------------------------- |
| `get_alchemy_dashboard`  | `{}`                                  | 炼丹状态与入口，服务端可能处理入门状态   |
| `enroll_alchemist`       | `{}`                                  | 加入炼丹师或恢复原入门引导               |
| `get_alchemy_recipes`    | `{ page: number }`                    | 丹方说明与预览入口                       |
| `preview_alchemy`        | `{ recipeId: number, count: number }` | 1..1000 炉预览；实际可炼数量以原预览为准 |
| `confirm_alchemy`        | `{ reference: string }`               | 用户确认后提交原 r1_a 引用               |
| `get_forge_overview`     | `{}`                                  | 锻造等级、图纸、材料和资格               |
| `preview_forge`          | `{ recipeId: number }`                | 普通锻造材料、费用、属性范围及确认 token |
| `preview_forge_tutorial` | `{}`                                  | 加入锻造师的入门制作预览                 |
| `confirm_forge`          | `{ reference: string }`               | 用户确认后提交原 r1_f 引用               |

炼丹返回 `{ reply, confirmations }`，reply 保留服务端完整说明、分块和按钮，confirmations 提取原确认按钮中的引用。`success` 或 Expose `ok` 不代表一定炼制成功，调用方必须阅读 reply 中的结果。锻造预览返回 token、expiresAt、材料、费用及属性范围；确认将 token 原样作为 reference 提交。

只接受相应类型的完整 r1_ 引用，不接受调用方提供的签名载荷、自由确认命令或 force 参数。引用校验、原预览内容和原操作编号由服务端 Redis 及数据库回执保留；确认前必须取得用户对原预览的明确同意。失效、规则变化或库存变化时按服务端拒绝处理，不重新预览后自动确认，也不将成功读取引用视作授权。

同一平台消息下的幂等键同时绑定业务操作、固定构造的具体命令及规范化参数，防止炼丹多个入口共用 alchemy.v2、空 arguments 时误读其他动作的回执。重试保留原引用；跨消息重复确认仍由原业务操作编号或确认编号去重。

### Expose 晋级、渡劫与心魔

| 动作                          | 参数                                                         | 说明                                                                 |
| ----------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| `promote_realm`               | `{}`                                                         | 原晋级入口，mode 区分 preparation 和 promotion；后者还须检查 success |
| `get_tribulation_preparation` | `{}`                                                         | 重新读取本人劫云；preparation 缺失表示没有可用准备状态               |
| `open_tribulation`            | `{ eventId: number }`                                        | 开启本场准备，不自动确认开劫                                         |
| `preview_tribulation`         | `{ eventId: number, grade: 'low' 或 'standard' 或 'high' }`  | 原评级材料、修为代价、倍率、战斗和条件快照，返回 r1_t 引用           |
| `confirm_tribulation`         | `{ reference: string }`                                      | 用户确认原评级后提交 r1_t 引用                                       |
| `get_tribulation_result`      | `{ eventId: number }`                                        | 每次重新读取本人原事件，不再次开劫                                   |
| `preview_heart_demon`         | `{ eventId: number, choice: 'guard' 或 'slay' 或 'accept' }` | 返回当前心魔选项与原策略绑定的 r1_h 引用                             |
| `confirm_heart_demon`         | `{ reference: string }`                                      | 用户确认后原样提交 r1_h 引用                                         |
| `evade_tribulation`           | `{ eventId: number }`                                        | 主动暂避，影响档位、恢复和重开时间，须用户明确要求                   |

开劫和结果查询返回 kind：charging 表示已接受、等待落雷或已取消等状态；receipt 才是实际结算；unconfirmed 表示开劫与回执都未得到完整确认，保留 failure / status 及 receiptFailure / receiptStatus。不得把调用成功或 charging 解释为渡劫成功；不得重新生成最新参数后自动提交。

评级预览保留原倍率、材料和修为代价，以及可用的心魔、因果、天时、暂避、捣乱与攻击上限快照。材料名称以数组映射返回。确认仅使用原引用，不接受调用方提交倍率、条件摘要或策略版本。跨玩家引用由服务端拒绝；引用使用 GET 保留原内容供重试。心魔回答与开劫的引用类型分别校验，不可互换。

### Expose 活跃、月卡与成就领奖

| 动作                                                    | 参数                         | 返回内容                                                |
| ------------------------------------------------------- | ---------------------------- | ------------------------------------------------------- |
| `get_daily_activity`、`get_weekly_activity`             | `{}`                         | 服务端周期、积分、任务、奖励阈值及领取状态              |
| `claim_daily_activity`、`claim_weekly_activity`         | `{ requiredPoints: number }` | 指定阈值实际发放的 `issued`；阈值从活跃面板读取         |
| `claim_all_daily_activity`、`claim_all_weekly_activity` | `{}`                         | `claimed`、`partial`，以及可选任务奖励和错误信息        |
| `claim_month_card_rewards`                              | `{}`                         | 实际领取天数、灵晶／丹药数量及领取后状态；不会购买月卡  |
| `claim_all_achievements`                                | `{}`                         | `locked` 与领取结果；保留服务端准入，不自行推断解锁境界 |

这些入口沿用服务端业务准入与当前消息幂等键，均不发送聊天消息。活跃面板通过业务入口读取，副作用暂按保守的 `write` 标注。`partial: true` 表示部分奖励已结算，不能当作全部成功或自动重新发奖；缺失的可选字段不会补造。成就 `locked: true` 时没有领取结果。月卡发奖后的状态查询失败可能返回失败提示，这不证明发奖已回滚，应先核对权益和库存。

### Expose 道具、小绿瓶与功法操作

| 动作                        | 参数                                                          | 返回内容                                                                                   |
| --------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `consume_item`              | `{ itemName: string, quantity: number }`                      | 消耗结果、提示、可选剩余数量；培元预览和明悟选项分别在 `peiyuanPending`、`mingwuSelection` |
| `get_green_bottle_capacity` | `{}`                                                          | 每瓶修为成本、最大可转换量及资格                                                           |
| `store_green_bottles`       | `{ count: number }`                                           | 实际转换量、剩余修为、小绿瓶总数；仍需检查内部 `success`                                   |
| `learn_skill_book`          | `{ bookId: number }`                                          | 学习结果或待确认的原／新功法及上限比较                                                     |
| `get_skill_switch_options`  | `{ skillType: '战技' 或 '被动技' 或 '神通' }`                 | 当前可切换实例及使用状态                                                                   |
| `switch_skill_book`         | `{ skillType: '战技' 或 '被动技' 或 '神通', bookId: number }` | 切换结果、待确认比较或服务端回退候选列表                                                   |

道具使用精确的单个名称（不支持空白分隔的多词名称和纯数字名称），最多64字符；数量和小绿瓶转换数量为1..2147483647，完整合成指令不超过80个Unicode字符。服务端继续校验库存、锁定、效果、实际数量和资格，参数上限不代表可以使用这么多。功法编号为背包返回的实例编号，不接受 `force`、`confirm` 或目标玩家字段。

本批仅接入现有非强制功法入口。`confirmation_required` 尚未完成学习或切换，`SHOW_LIST` 尚未切换；待确认替换仍需接入绑定原预览的确认机制。`peiyuan_pending` 与 `mingwu_select` 保留服务端原预览／候选，当前没有开放培元确认和明悟选择的 Expose 动作，不能把它们描述为培养完成，也不能自动发起新的服用覆盖原预览。

### Expose 商店预览与原报价确认

| 动作                    | 参数                                   | 返回内容                                                              |
| ----------------------- | -------------------------------------- | --------------------------------------------------------------------- |
| `preview_shop_purchase` | `{ productId: number, count: number }` | 原商品、份数、支付文案、发放量，以及 `reference`、`expiresAt`；仅预览 |
| `confirm_shop_purchase` | `{ reference: string }`                | 原引用及实际购买回执；拒绝原因保留在 `replies`                        |

商品编号来自 `get_shop_products`。两步通过 `shops.purchase` 的新 `mode=preview/reference` 调用，原聊天购买入口保持兼容。Expose 购买始终需要原预览引用，即使商品低于用户配置的确认阈值也不会在预览时购买。确认不接受商品、数量、UID或 `confirmed` 参数。

本批为商店新增 `r1_UID_s_时间戳_随机数` 类型（s=商店）。完整原预览保存在服务端 Redis，5分钟内可首次确认，引用保留24小时用于核对及重试。确认事务内复核商品配置、VIP折扣、支付和发放量，继续校验余额、限购、境界及其他资格；变化后明确拒绝，不自动使用最新报价。复用现有SQL幂等表，将回执与扣款、发奖一起提交，同引用在其他消息重试也不重复购买。提交结果未知时保留原引用核对，不能生成新引用后自动再次购买。

需要先部署支持这两个 mode 的服务端，再使用本批机器人能力；不新增数据库字段或迁移，也不生成新的聊天确认按钮。
