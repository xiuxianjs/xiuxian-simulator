---
name: feature-dev
description: 项目业务功能开发入口：涉及路由、响应、服务端接口、奖励或并发改动时启用
---

## 这是做什么的

这是一个**入口型文档**，用于在开始做业务功能开发前快速判断：

- 这次任务要不要启用本 skill
- 开始前必须先看哪些真实实现
- 哪些点最容易做错
- 提交前该怎么自检

这里的 `feature-dev` 指的是**开发协作 skill**，不是游戏里的功法、技能系统说明。

具体实现细节、代码模式示例和更完整的参考，统一看同目录下的 [content.md](content.md)。

---

## 最重要的前提：客户端 / 服务端已经分离

| 职责                                   | 落点                                                                                                                    | 说明                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 玩法规则、数值、公式、掉落、冷却、结算 | `../xiuxian-game-server/internal/service/**`（必要时 `internal/battle/**`、`internal/worker/**`）                       | **服务端是唯一设计解释权**            |
| HTTP 契约、路由注册                    | 服务端 `docs/openapi.yaml`、`internal/httpapi/**`                                                                       | 改接口时同步 `docs/api-coverage.json` |
| 指令路由                               | 本仓 [src/router.ts](../../../src/router.ts)                                                                            | 指令匹配、层级、顺序                  |
| 业务投影                               | 本仓 [src/response-apps](../../../src/response-apps) 的 `<domain>/app.ts`                                               | 调用接口、把服务端数据变成页面输入    |
| 气泡排版与交互                         | 本仓 [src/response](../../../src/response) 的 `<cmd>/res.ts`                                                            | 只负责解析参数、编排交互、渲染        |
| 接口封装                               | 本仓 [src/api/bot](../../../src/api/bot)                                                                                | 一个能力一个薄封装                    |
| 接口契约与类型                         | 本仓 [src/api/domains](../../../src/api/domains)、[src/types](../../../src/types)                                       | operationId、请求/响应类型            |
| 图片渲染                               | 本仓 [src/img](../../../src/img)、[src/utils/imageRender.ts](../../../src/utils/imageRender.ts)                         | 平台展示能力                          |
| 平台投递                               | 本仓 [src/task/pushMessageTask.ts](../../../src/task/pushMessageTask.ts)、[src/notification](../../../src/notification) | relay 拉取 + 平台发送                 |
| 埋点                                   | 本仓 [src/analytics](../../../src/analytics)                                                                            | 独立分析项目，**不下沉服务端**        |

> `src/model/**` 与 `src/db/**` **已经物理删除**，不再有这两个目录。
> 任何“往 model / db 里写业务逻辑”的做法都已经是错的：
> 客户端不再持有游戏规则，也不直连 MySQL / Redis。
> 修改前仍要检查客户端是否重新触及这两层；当前 `package.json` 没有对应的 Yarn 门禁脚本。

---

## 启用时机

出现以下任一情况，就先启用本 skill：

- 新增或改造一个完整业务链路，改动会跨 [router.ts](../../../src/router.ts)、[src/response](../../../src/response)、[src/response-apps](../../../src/response-apps)、服务端 `internal/service/**` 两处及以上
- 新增指令、修改指令匹配、调整路由接入位置，或不确定该挂在哪个中间件层级
- 新增或改造响应处理器，需要复用 `onResponse(...)`、`useMessage()`、`e?.UserId`、`FormatGui(...)`
- 业务规则需要新增或调整（数值、掉落、冷却、结算、资格判定），或不确定该落到哪个服务端 service
- 需要新增 / 修改接口，或不确定该改服务端 `docs/openapi.yaml` 的哪一部分
- 涉及奖励、货币、物品发放、幂等保护，或不确定该由服务端哪个 service 承接
- 涉及重复提交、重复领取、并发写入，或不确定服务端是否已有幂等 / 唯一约束
- 不确定逻辑该放在「服务端 service / 客户端投影 / 响应层」哪一层
- 任务要求“按项目现有实现方式写”，而你需要先摸清当前项目真实模式
- 排查任务归属、通知 SSE 或图片上传等依赖部署配置的链路，需要核对环境变量、`alemon.config.yaml` 和外部服务

如果任务主要是**战斗数值、伤害公式、Buff/技能计算**，还应同时查看 `battle-numerical`。

---

## 开始前必查

开始实现前，至少按下面顺序过一遍：

1. [content.md](content.md)
   - 先看整体开发模式，再决定实现方案

2. 目标功能附近的真实代码
   - 先看同模块已有指令、同目录已有响应、同领域已有投影与接口封装
   - 服务端先看 `../xiuxian-game-server/internal/service` 里同域的 service
   - **离目标最近的真实实现优先级最高**

3. 路由接入位置
   - 看 [router.ts](../../../src/router.ts)
   - 重点确认正则写法、匹配顺序、中间件层级、是否会被前置拦截覆盖

4. 响应构建方式
   - 看 [messageHelper.ts](../../../src/utils/messageHelper.ts)
   - 看真实示例 [checkIn/res.ts](../../../src/response/checkIn/res.ts)
   - 重点确认 `FormatGui`、`Format.createMarkdown()`、按钮区放置方式是否与现有页面一致

5. 分层落点
   - 业务规则 → 服务端 `internal/service/**`
   - 接口封装 → [src/api/bot](../../../src/api/bot) 下的 `<domain>-*.ts`
   - 业务投影 → [src/response-apps](../../../src/response-apps) 下的 `<domain>/app.ts`
   - 指令与气泡 → [src/response](../../../src/response) 下的 `<cmd>/res.ts`
   - 判断标准：只有“展示与交互”留在客户端，规则与结算一律在服务端

6. 接口契约
   - 先看 [src/api/domains](../../../src/api/domains) 里是否已有对应 operationId
   - 没有就改服务端 `docs/openapi.yaml` + `internal/httpapi/**`，再回填客户端契约
   - 改动接口后同步更新服务端 `docs/api-coverage.json`

7. 奖励与幂等
   - 发奖、扣费、领取记录、流水都在服务端 service 里，客户端只提交请求并展示回执
   - 客户端侧要确认：写操作是否带上了 `Idempotency-Key`（见 [src/api/bot/client.ts](../../../src/api/bot/client.ts) 的 `writeContext`）

8. 运行配置与外部依赖
   - 核对启动方式是否实际加载 `.env`；后端基础地址只填 origin，内部接口路径以当前 `/api/v1/internal/...` 路由为准
   - 图片上传配置来自 `alemon.config.yaml` 的 `xiuxian-game.minio`，核对字段、存储服务和桶；不得提交密钥
   - 核对依赖的数据库表是否已按服务端迁移部署；缺失时明确指出迁移前置条件

---

## 高风险点

- **ID 容易混用**
  - 响应层里的 `e.UserId` 是平台侧 `bid`
  - 业务侧需要的是 `e.uid`，对应服务端的玩家 ID
  - `@用户` 和 `FormatGui` 场景用 `bid`，调用接口时按契约传 `path.id` 与 `X-Bid`

- **路由顺序容易误伤**
  - [router.ts](../../../src/router.ts) 是按树和顺序匹配的
  - 新正则过宽、放错层级、插入位置不对，都会导致已有指令被抢匹配或被前置拦截

- **消息构建方式容易写散**
  - 当前项目更推荐走 `FormatGui + Format`
  - `content` 应来自 `Format.createMarkdown()`
  - 底部 BT 按钮应放在 `bar`
  - 不要同一功能一半手写文本、一半页面化输出

- **把规则写回客户端**
  - 客户端已经没有任何游戏规则实现
  - 不要在投影层或响应层“顺手算一下收益 / 判断一下资格”，这类逻辑要落到服务端 service
  - 客户端的职责是把服务端返回的事实渲染出来

- **接口改动不同步**
  - 改服务端接口必须同步：`docs/openapi.yaml`、`internal/httpapi/**`、客户端 `src/api/domains/**` 契约
  - 新指令若要进入迁移台账，还要更新服务端 `docs/api-coverage.json`
  - 漏掉客户端契约会导致类型检查报错，漏掉台账会导致服务端文档或覆盖率检查失败

- **奖励发放容易走出两套逻辑**
  - 发奖与流水只有一个实现位置：服务端 service + 事务
  - 客户端不要自行拼接多张表的改动，也不要缓存“待发奖”状态

- **关键流程容易缺幂等**
  - 领取、购买、签到、兑换、重复提交这类流程，服务端负责 Redis 锁 / 事务 / 唯一条件 / 失败回滚
  - 客户端负责携带幂等键，并对失败结果如实展示，不自动重试写操作

- **文档与现状可能不完全同步**
  - `content.md` 是入口后的参考资料
  - 如果它和目标目录的真实代码不一致，以目标代码附近的现状为准

---

## 可不启用的情况

以下情况通常不需要启用本 skill：

- 只改文案、错别字、注释、README、纯说明文档
- 只做局部且明确的小修复，且你已经确认目标文件层级和写法
- 只改与业务结构无关的格式整理
- 只做纯战斗数值调整，且不涉及路由、响应、接口接入

拿不准时，默认启用，不要猜。

---

## 自检

提交前至少确认以下问题：

- 是否先看了 [content.md](content.md) 和目标功能附近的真实实现
- 是否把玩法规则 / 数值 / 结算放在了服务端 `internal/service/**`，而不是客户端
- 是否确认了客户端改动只落在「路由 / 投影 / 展示 / 接口封装」四类落点
- 是否检查了 [router.ts](../../../src/router.ts) 的匹配顺序和接入层级
- 是否按现有项目方式构建消息，尤其是 `FormatGui`、Markdown 和按钮区
- 是否正确区分了 `bid` 与 `uid`
- 新增或修改接口时，是否同步了 `docs/openapi.yaml`、`internal/httpapi/**`、客户端契约与 `docs/api-coverage.json`
- 是否在涉及发奖时复用了服务端已有的发放与流水入口
- 是否在涉及领取、购买、签到、兑换等关键流程时携带了幂等键
- 是否避免为了“写得更通用”而硬改项目现有成熟结构
- 是否核对实际加载的运行配置、外部服务和数据库迁移，而不只检查类型与构建

以上任一项不能确定，就先回到 `content.md` 和目标代码继续核对，再开始实现。
