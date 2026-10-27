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
