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

### Expose 常用成长入口

`xiuxian.player.v1` 版本 `1.18.0` 新增以下能力：

| Action                     | 输入                             | 返回与约束                                           |
| -------------------------- | -------------------------------- | ---------------------------------------------------- |
| `get_skill_book_detail`    | `bookId`：本人已学实例编号       | 当前与上限属性、效果、熟练度和可操作状态；不执行养成 |
| `comprehend_skill_book`    | `bookId`、`points`：正整数熟练点 | 实际投入、成功与失败次数、保底和剩余点数             |
| `upgrade_skill_book`       | `bookId`、`count`：1..36         | 实际成功次数、经验与灵石消耗、属性变化及停止原因     |
| `get_profession_dashboard` | `{}`                             | 炼丹师、灵药师等级经验、装备、引导状态和开放条件     |

所有入口沿用服务端准入与当前消息身份，不接受调用方指定玩家 UID。必须同时检查调用结果 `ok` 与业务 `success`；被拒绝时读取 `replies`，不得宣称操作完成。升级可能提前停止，`upgradeCount` 是请求次数，`successCount` 才是实际成功次数。写入重试应使用原平台消息；更换消息会产生新操作。可选字段省略表示未提供，不能当作零；职业 `access.features` 以 `{key, realmReached, requiredRealm, lockedReason}` 数组保留服务端条件。

### Expose 队伍与匹配

| 动作                                                  | 参数                                             | 返回内容                                                             |
| ----------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| `get_my_team`                                         | `{}`                                             | 本人队伍、服务端准入及成员操作资格                                   |
| `get_team_info`                                       | `{ teamId: number }`                             | 指定队伍的可见资料；操作权限以 `team.actions` 为准                   |
| `get_team_list`                                       | `{ page?: number }`                              | 服务端队伍列表，默认第1页，每页5条                                   |
| `create_team`                                         | `{}`                                             | 实际创建的 `teamId`                                                  |
| `apply_to_team`                                       | `{ teamId: number }`                             | `applicationId`、队伍编号、status 和 autoApproved；false表示等待审核 |
| `get_team_applications`                               | `{}`                                             | 队长待审核申请；canReview=false 时保留服务端 error                   |
| `approve_team_application`、`reject_team_application` | `{ applicationId: number }`                      | 同意后的队伍编号，或明确拒绝回执                                     |
| `leave_team`、`disband_team`                          | `{}`                                             | 离队或解散回执；解散影响整支队伍，角色及权限由服务端校验             |
| `get_team_match`                                      | `{}`                                             | matching 及可用的服务端等待秒数、超时与匹配阶段快照                  |
| `start_mainline_match`                                | `{ chapterNumber: number, stageNumber: number }` | 已进入匹配队列的实际目标标签                                         |
| `start_dungeon_match`                                 | `{ dungeonId: number }`                          | 秘境匹配目标标签，服务端拒绝单人秘境等不合资格目标                   |
| `cancel_team_match`                                   | `{}`                                             | cancelled 及可选目标标签；false不代表已解散队伍                      |

队伍编号、申请编号使用服务端列表中的原编号，不接受主体UID、队长身份或跳过准入参数。`hasTeam` 以服务端 `exists` 判定；队伍、姓名和目标的可选null字段省略，不补造“未知”姓名或空队伍。`get_team_info` 不输出该旧接口未填充的 access 默认值，权限取自 `team.actions`；本人 overview 的 access 保留。队长离队可能触发服务端原有继任规则，应重新读取队伍状态。

入队申请与真正入队分开：仅 `autoApproved=true` 表示服务端自动审批已完成，其余等待队长处理。开始匹配只表示入队列，匹配成功、战斗开始、结算都须读取后续权威状态；本批不启动或替代服务端匹配 Worker。取消队列不等于回滚已发生的战斗。创建、审核、离队、解散及队列操作沿用当前消息幂等键，业务通知仍由服务端原通知链路处理，Expose 不发送聊天消息。

### Expose 通天塔

`xiuxian.player.v1` 版本 `1.19.0` 增加 10 项通天塔能力：

| Action                               | 输入与用途                                           |
| ------------------------------------ | ---------------------------------------------------- |
| `get_tongtian_tower`                 | `{}`；开放状态、排名、成本及可扫荡目标               |
| `challenge_tongtian_rank`            | `targetRank`：1..1999；单次挑战                      |
| `batch_challenge_tongtian`           | `{}`；按现有连续爬塔规则处理，返回逐轮事件与停止原因 |
| `sweep_tongtian_rank`                | `targetRank`：1..1999、`count`：1..10；扫荡较低排名  |
| `get_tongtian_first_rewards`         | `{}`；首通档位和可领状态                             |
| `get_tongtian_monthly_rewards`       | `{}`；月度档位、最佳排名及领取记录                   |
| `claim_tongtian_first_reward`        | `ranking`：首通档位排名                              |
| `claim_all_tongtian_first_rewards`   | `{}`；领取全部可领首通档位                           |
| `claim_tongtian_monthly_reward`      | `rewardId`：月度档位 ID，与排名分开                  |
| `claim_all_tongtian_monthly_rewards` | `{}`；领取全部可领月度档位                           |

调用 `ok` 和业务 `success` 均成功后，仍须检查单次战斗的 `result.success` / `battle.winner`、批量 `events` / `stopReason` 和实际领取回执。业务成功不等于获胜或完成全部轮次。首通与月度查询保留开放期、境界与档位状态，不把奖励配置当作所得。通天塔查询可能初始化排名；所有入口保留当前消息身份、服务端准入和原消息重试幂等机制，不自动服药或重启挑战。

### Expose 成就与称号

版本 `1.20.0` 增加 9 项能力：

| Action                            | 输入与用途                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| `get_achievement_overview`        | `{}`；成就分类、完成率与可领数量                                                             |
| `get_achievement_category`        | `category`：`general`、`storyline`、`lingzhi`、`combat_power`、`tower_shop_unlock`、`master` |
| `get_all_achievements`            | `page`：正整数，每页5项全部配置                                                              |
| `get_completed_achievements`      | `page`：正整数，每页5项本人已达成记录                                                        |
| `get_combat_power_achievements`   | `{}`；战力、里程碑、历史领取与下一目标                                                       |
| `claim_combat_power_achievements` | `{}`；领取当前可领的战力成就奖励                                                             |
| `get_titles`                      | `{}`；本人有效称号、状态、说明和有效期                                                       |
| `activate_title`                  | `titleId`：本人称号列表返回的持有记录 ID                                                     |
| `deactivate_title`                | `{}`；卸下当前称号，`removed=false` 表示无称号需要卸下                                       |

成就保留服务端的 `completed`、`claimed`、`reachable` 等不同状态，查询配置不等于已领取。`locked=true` 是资格受限，不等于空记录；未提供的名称、描述或日期按可选字段处理，不补造文本。战力领奖返回实际领取数和奖励文案。称号所有权、过期和佩戴互斥由服务端检查；重复操作使用原消息幂等键，越权与失效错误原样作为调用失败返回。

### Expose 明悟丹选择与服用

版本 `1.21.0` 增加 `use_mingwu_pill({skillBookId, quantity, expectedProficiency})`。先调用 `consume_item({itemName:"明悟丹", quantity:数量})` 获取 `mingwuSelection`，从 `canSelect=true` 的选项提取功法模板 `skillBookId` 和原 `proficiency`，再原样传入选中编号、数量与 `expectedProficiency`（0..59）。服务端在扣药事务的功法行锁内比较原熟练度；功法被卸下、归属不符、熟练度变化、库存或次数不足时拒绝，不自动更新选择。

必须读取实际 `consumedCount`、`proficiencyGain`、`currentProficiency` 和 `remainingCount`；临近原有60%上限可能只消耗部分所选丹药。同一原消息重试使用原幂等键，新消息重复旧状态会被拒绝。该入口需配套发布服务端的 `expectedProficiency` 校验；旧聊天接口继续兼容。

### Expose 培元丹原预览确认

版本 `1.22.0` 增加 `get_peiyuan_confirmation({snapshot})`、`confirm_peiyuan_pill({reference})`、`cancel_peiyuan_pill({reference})`。

先通过 `consume_item` 取得培元丹 `peiyuanPending.snapshot`，再将原摘要交给 `get_peiyuan_confirmation`。它返回完整原变化、原时限和服务端 `p` 类型引用；原摘要缺失或不匹配时不能自动改为最新记录。确认、取消均只传引用，保留原60秒期限，引用保留24小时用于已结算重试；重新获取引用不会延长原时限。旧服务端未返回摘要时，先核对原结果，不重发消耗请求。

属性应用与原决定回执在现有 SQL 表同一事务提交；确认重试不重复应用，取消不返还已服用的丹药。同一原预览的不同引用共享唯一决定，确认与取消互斥；已处理引用的重试返回原结果，即使出现了新预览也不会处理或删除它。新操作要求原属性及当前上限仍支持原变化，状态变化时明确拒绝。Redis 清理失败时已提交回执仍有效，可用原引用重试清理，未清理的原待确认缓存至多保留其原时限。

需配套发布服务端摘要、引用和结算支持。旧聊天确认与取消保留原入口，共用玩家操作锁；不新增数据库字段或迁移。

### Expose 灵根培养原预览确认

版本 `1.23.0` 为 `preview_spirit_root_feed({itemId, quantity})` 增加服务端 `r` 类型 `reference` 与 `expiresAt`，并新增 `confirm_spirit_root_feed({reference})`。预览数量沿用服务端上限1,000,000；预览5分钟有效，引用保留24小时供已结算重试。预览不消耗材料，确认仅传原引用，不重新指定材料、数量或当前状态。

服务端在原扣料事务中核对完整原预览：材料、请求与实际消耗数量、培养增量、原品质和培养值，以及阶段目标与进度。状态、材料定义或培养效果变化时明确拒绝；不使用最新预览替换原确认。实际消耗以 `feed.consumed` 为准，例如现有规则下培养值99、请求10份清灵草时，仅消耗1份、增加5点至104，原溢出保留规则不变。

引用作为稳定业务编号，继续复用 `SpiritRootEvent`：扣料、培养和原回执同事务提交；同一引用跨消息重试返回原回执，成功后的重试不因预览过期或后续状态变化再次扣料。旧聊天预览和确认入口继续兼容，不新增数据库字段。需配套发布服务端引用支持；缺失原引用时明确失败，不降级成无绑定的确认。

### Expose 宗门申请与审核

版本 `1.24.0` 增加 8 项能力：

| Action                          | 输入与用途                                          |
| ------------------------------- | --------------------------------------------------- |
| `get_guild_list`                | `page`；每页5项宗门资料与申请资格，保留页码纠正状态 |
| `apply_to_guild`                | `guildId`；提交申请，成功不代表已经入宗             |
| `get_guild_applications`        | `{}`；本人待处理申请及可撤回状态                    |
| `cancel_guild_application`      | `applicationId`；撤回本人指定申请，不退出宗门       |
| `get_guild_members`             | `page`；本人宗门的成员、职位、活跃和贡献            |
| `get_guild_review_applications` | `page`；有权限时返回待审核申请与申请人编号          |
| `approve_guild_application`     | `applicantId`、`applicationId`；同意原申请          |
| `reject_guild_application`      | `applicantId`、`applicationId`；拒绝原申请          |

审核必须同时使用列表中的原申请编号与申请人编号。服务端在当前宗门及权限校验后，锁定申请行并核对原编号；撤回重提时拒绝原编号，不自动审核新申请。申请编号用于匹配原记录，不能替代权限校验；失效资格仍按服务端原有规则处理，拒绝结果不表示入宗成功。旧聊天审核继续兼容，Expose 审核需配套发布服务端原申请校验。

本批4个查询每次采用框架调用编号区分读取，允许同一条 AI 消息中提交或审核后重新查询新状态；写操作继续使用原消息、操作及参数生成稳定幂等键。缺失的简介、境界或姓名保留为可选字段，不填造展示文案；无权查询、未入宗与查询失败保留业务拒绝，不替换成空列表。宗门列表 `redirected=true` 表示已纠正页码，若 `result` 缺失则表示纠正查询失败。

### Expose 查询快照

版本 `1.25.0` 对日常和周常活跃、宗门日常和周常、队伍信息、队伍列表、队伍申请及匹配状态使用每次调用的新查询回执。同一条消息中领取、组队或变更后可以重新读取最新状态；领取、创建及其他写操作仍沿用原消息生成的稳定幂等键，避免重试重复结算。查询仍遵守服务端准入及周期处理，不能将业务拒绝当作空数据。

### Expose 灵药师入门

版本 `1.26.0` 新增 `start_herbalist_guide`，开启或恢复本人灵药师指引，返回服务端步骤、版本、创建时间和过期时间；已入门或不满足条件时返回服务端拒绝。开始指引不表示已完成入门或发放物资。

版本 `1.27.0` 新增 `get_herbalist_guide` 和 `continue_herbalist_guide`。查询返回当前会话；继续需要携带完整原 session，服务端核对原步骤、版本、创建与过期时间，旧状态不得推进新指引。最后一步按服务端原事务启用职业和发放入门物资；只以实际 completed 和 activation 回执确认完成。会话缺失不等于未入门，结果未知时核对职业及灵田状态。此能力需配套发布服务端。

### Expose 功法切换确认

版本 `1.28.0` 新增 `prepare_skill_switch` 与 `confirm_skill_switch`。准备操作在空槽位可直接切换；已有使用中功法时返回服务端原比较与 `reference`，确认须携带同一类型、目标实例和引用。服务端在事务内核对两本功法及原比较属性，变化时拒绝；成功回执与切换同时提交，跨消息重试复用原回执。引用绑定玩家，在 Redis 中保留 24 小时，失效或缓存不可用时应先核对结果。需机器人与服务端配套发布。

版本 `1.29.0` 新增 `prepare_skill_learn` 和 `confirm_skill_learn`。准备时没有旧功法则直接学习；需要替换时返回原功法比较、预计返还及引用。确认会核对原目标、旧功法、熟练度、强化和返还配置，事务中完成经验材料返还、熟练度转移及原回执保存。引用绑定玩家并保留 24 小时，缓存不可用或引用失效时先核对原结果；需机器人与服务端配套发布。

### Expose 初入仙途

版本 `1.30.0` 增加 `get_newcomer_activity`、`claim_newcomer_login` 和 `claim_newcomer_task`。面板返回服务端活动进度和可领奖里程碑，只有原领奖命令包含合法编号时才提供 `taskConfigId`；领取结果按实际回执判断，零奖励和无可领状态不会被当成发奖。活动面板每次调用获取新快照，写操作保持原消息幂等。

版本 `1.31.0` 新增批量开垦 `cultivate_all_cave_plots`、单块升级 `upgrade_cave_plot` 和加速选项查询 `get_cave_acceleration_options`。开垦和升级按服务端实际消耗执行；加速查询仅展示当下报价，操作后的快照错误不代表操作未提交。

版本 `1.32.0` 新增 `prepare_cave_acceleration` 和 `confirm_cave_acceleration`，支持灵肥、小绿瓶、灵石及催熟。准备时返回原作物、请求次数、灵石消耗上限和服务端引用；确认时在事务内核对原作物及加速条件，实际消耗与回执同时提交。状态变化或库存不足时拒绝，引用跨消息重试复用原回执。缓存失效时先核对灵田和原结果；机器人与服务端需配套发布。
