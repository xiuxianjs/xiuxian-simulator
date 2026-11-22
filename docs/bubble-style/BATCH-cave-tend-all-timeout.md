# 灵田批量打理超时修复

## 背景

世界服玩家反馈「灵田无法打理」：`/一键打理灵田` 直接回 `Request timed out`，`/一键收割` 回「收割灵植结果未获完整确认」。

排查结论：服务端 `TendAll` 为达成照料与收割最多执行 4 个串行独立事务（`cave_tend_all.go:47-105`），单条指令的工作量约等于 4 条单地块指令；但机器人侧 `backendRequestTimeout`（`src/api/bot/battle-request.ts`）只为钓鱼写操作与战斗/批量 op 放宽预算，`cave.*` 全部沿用 `api_timeout_ms`（缺省 10 秒）。超时发生在客户端，服务端事务仍可能提交，客户端已放弃等待，玩家看到失败但状态可能已变更。

## 改动

1. **请求预算**：`backendRequestTimeout` 新增 `caveSettlementOperations`（`cave.tend-all`、`cave.companion-tend-all`、`cave.harvest`），与钓鱼写操作同口径放宽到 `Math.max(configured, 60_000)`。只改等待时长，不改幂等键、不改重试，也不把灵田误判为战斗 op（避免战斗文案覆盖权威业务回执）。
2. **超时兜底**：`caveRecoveryTips` 的 `cave.tend-all` 规则与 `social` 分支（覆盖 `cave.companion-tend-all`）现在同时识别 `Request timed out`、`Network request failed`、`Request aborted`，给出只读核对入口。
3. **气泡**：`tendAll/res.ts` 的 catch 分支在服务端无回执时补一行「本次打理结果未获完整确认，请先核对当前灵田与原回执。」并挂出核对入口；`settled` 置 false，超时后不再触发奇遇探针。

## 气泡对照

改前：仅 `Request timed out` 一行 + `/我的灵田` 返回按钮，没有核对入口。

改后：保留原回执文案（服务端/传输层原文不改写），补一行未获完整确认提示，并挂「核对已完成的灵田操作」入口。

对照图在仓库外：`bubble-style-mockups/cave-tend-all-timeout-before-after.png`，使用示例数据。

## 自检（gameplay-simplify / bubble-style）

- 本次不新增前置缺口，因此不涉及四类缺口归类与自动补齐；超时属于「结果未知」，只提供只读核对路径，不代选、不重放。
- 超时分支不扣任何资源，仍有 `/我的灵田`（或 `/我的道侣`）返回入口。
- 未改动任何境界、星数、职业等级、时段、次数门槛；未删既有按钮与入口。
- 按钮指令均为固定文本，不含凭据，长度远低于 80 Unicode 字符。
- 服务端原文（含引擎英文回执）原样展示，机器人只追加提示与入口，不改写服务端文案。

## 验证

- 新增 `test/framework/cave-tend-all-timeout.test.ts`：断言三类灵田 op 的长预算、其它 `cave.*` 保持配置值、`isBattleOperation` 不被误判；断言己方与道侣两条链路的超时都保留核对入口，且成功回执不新增入口。
- `node tools/run-framework-tests.mjs --offline --filter=cave-tend-all-timeout`：2/2 通过。
- `cave` 相关离线回归：837 通过、10 失败；经 `git stash` 对照确认这 10 项（`cave-home` 成就入口 6 项、panel/visit/lingzhi 4 项）在本改动前同样失败，属既有失败，未因本次改动新增。
- `tsgo` 对本改动文件零错误；`eslint` 对 `battle-request.ts`、`caveRecovery.ts`、`tendAll/res.ts` 通过。
- 未做真实平台投递与线上 `api_timeout_ms` 核实；线上超时真值仍需部署后观察。

## 未覆盖

- `cave.tend-all` 仍无回执查询接口（`robot_business_receipt.go` 只支持 `cave.accelerate` 与 `skill-books.batch-decompose`），超时后仍无法自动自证结果，只能引导玩家核对。
- 服务端 4 个串行事务未收敛，与「同事务」简化硬性规则仍存在差距，需单独评审。
