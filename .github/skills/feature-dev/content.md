## **1. 先判断你在做哪条链路**

这里的 `feature-dev` 是开发协作 skill，用于指导你在本仓库里落业务功能，不是游戏内“技能 / 功法系统”的玩法说明。Codex 的项目入口位于 `.agents/skills/feature-dev/SKILL.md`。

### 0. 先记住职责边界

**服务端（`../xiuxian-game-server`）是唯一设计解释权**：玩法规则、数值、公式、掉落、冷却、结算、交易、发奖都在那里。

客户端（本仓库）只保留四类落点：

| 落点           | 路径                                                                             | 干什么                                |
| -------------- | -------------------------------------------------------------------------------- | ------------------------------------- |
| 指令路由       | [src/router.ts](../../../src/router.ts)                                          | 把指令挂到正确的中间件层级            |
| 业务投影       | [src/response-apps](../../../src/response-apps) 的 `<domain>/app.ts`             | 调接口、把服务端数据整理成页面输入    |
| 气泡展示与交互 | [src/response](../../../src/response) 的 `<cmd>/res.ts`                          | 解析参数、编排交互、渲染              |
| 接口封装与契约 | [src/api/bot](../../../src/api/bot)、[src/api/domains](../../../src/api/domains) | 一个能力一个薄封装 + operationId 契约 |

另外三类平台能力也留在客户端：[src/img](../../../src/img) 与 [src/utils/imageRender.ts](../../../src/utils/imageRender.ts)（图片渲染）、[src/task/pushMessageTask.ts](../../../src/task/pushMessageTask.ts) 与 [src/notification](../../../src/notification)（平台投递）、[src/analytics](../../../src/analytics)（埋点，独立分析项目，不下沉服务端）。

> ⚠️ **`src/model/**` 与 `src/db/**` 已经物理删除**。
> 它们曾经承载 Node 版的业务规则与 Sequelize 模型，现在这些职责全部在 Go 服务端。
> 任何文档、注释、示例里如果还写着“逻辑下沉到 `src/model`”“补 `src/db/models`”，都是历史表述，不要照做。
> 当前 `package.json` 没有分层门禁脚本；修改时需结合当前源码检查客户端是否重新触达这两层。

### 1. 一条业务功能的完整落地链路

在本仓库做业务功能时，通常不是“写一个文件”这么简单，而是沿着一条固定链路落地：

```text
服务端: internal/service/**（规则 / 结算）  +  internal/httpapi/**（路由）  +  docs/openapi.yaml（契约）
   ↓
客户端: src/api/domains/**（契约类型） → src/api/bot/*.ts（接口封装）
   ↓
客户端: src/response-apps/<domain>/app.ts（业务投影）
   ↓
客户端: src/response/<cmd>/res.ts（参数解析 + 气泡）+ src/router.ts（指令接入）
   ↓
校验: tsgo → yarn lint:fix（按改动范围补充测试与构建）
```

改动范围决定你要不要动服务端：

- **只是把服务端已有能力接进新指令** → 只改客户端第 2~4 层
- **需要新规则 / 新数值 / 新结算** → 先改服务端 `internal/service/**`，必要时补接口与契约
- **需要新接口** → 服务端 `docs/openapi.yaml` + `internal/httpapi/**`，客户端补 `src/api/domains/**`，并同步服务端 `docs/api-coverage.json`

### 2. 三条真实链路，照着看

- **查询型链路**
  - 指令：`/储物袋 道具 丹药 2`
  - 路由： [src/router.ts](../../../src/router.ts)
  - 响应： [src/response/storage/newBag/props/res.ts](../../../src/response/storage/newBag/props/res.ts)
  - 投影： [src/response-apps/storage/newBag/props/app.ts](../../../src/response-apps/storage/newBag/props/app.ts)
  - 接口封装： [src/api/bot/inventory.ts](../../../src/api/bot/inventory.ts)
  - 服务端规则： `../xiuxian-game-server/internal/service/` 里对应的 inventory / bag 查询 service

- **提交型链路**
  - 指令：`/交易上架 丹药 36`
  - 路由： [src/router.ts](../../../src/router.ts)
  - 响应： [src/response/market/sell/res.ts](../../../src/response/market/sell/res.ts)
  - 投影： [src/response-apps/market/sell/app.ts](../../../src/response-apps/market/sell/app.ts)
  - 接口封装： [src/api/bot/market-trade.ts](../../../src/api/bot/market-trade.ts)
  - 服务端规则： `../xiuxian-game-server/internal/service/market_service.go`

- **奖励型链路**
  - 指令：`/领取日常活跃奖励 30`
  - 路由： [src/router.ts](../../../src/router.ts)
  - 响应： [src/response/activityPoints/claimDaily/res.ts](../../../src/response/activityPoints/claimDaily/res.ts)
  - 投影： [src/response-apps/activityPoints/claim/app.ts](../../../src/response-apps/activityPoints/claim/app.ts)
  - 接口封装： [src/api/bot/activity-points-claim.ts](../../../src/api/bot/activity-points-claim.ts)
  - 服务端规则： `../xiuxian-game-server/internal/service/activity_points_query.go` 与同域的领取 service

---

## **2. 项目约束**

开始写之前，先把这些约束记住：

- **包管理器是 Yarn**
  - [package.json](../../../package.json) 里声明了 `packageManager: "yarn@1.22.22"`
  - 开发、构建、校验都用 `yarn ...`

- **当前项目是阿柠檬框架响应式接入**
  - 路由入口是 [src/router.ts](../../../src/router.ts)
  - 响应统一使用 [src/response/config.ts](../../../src/response/config.ts) 里的 `selects`
  - 常见写法是 `onResponse(selects, async e => { ... })`

- **`bid` 和 `uid` 不是一个东西**
  - [src/utils/messageHelper.ts](../../../src/utils/messageHelper.ts) 里的 `e?.UserId` 直接取 `e.UserId`
  - `bid` 用在 `@用户`、`FormatGui`，也作为 `X-Bid` 传给服务端
  - `uid` 是调用接口时的 `path.id`，通常来自 `e.uid as number`

- **消息输出优先走 `FormatGui + Format`**
  - 页面化展示优先看 [src/utils/messageHelper.ts](../../../src/utils/messageHelper.ts)
  - `content` 用 `Format.createMarkdown()`
  - 底部 BT 按钮用 `Format.createButtonGroup()`，再交给 `bar`

- **货币是固定三层**
  - 灵石、灵晶、道晶的余额与流水都在服务端
  - 客户端只读取接口返回值并展示，不做任何加法

- **写操作必须带幂等键**
  - 见 [src/api/bot/client.ts](../../../src/api/bot/client.ts) 的 `writeContext(request)` / `writeTraceContext(request)`
  - 平台消息缺少唯一标识时会直接抛错，这是刻意设计：宁可失败也不要重复扣费

- **初始化代码不是当前开发主路径**
  - 真正需要改的只有服务端 service 与客户端四类落点
  - 旧的数据库同步 / 初始化链路已随 `src/db` 一起删除，不要再去找 `yarn sync`

---

## **3. 路由与响应怎么接**

### 3.1 路由树先看层级，再看顺序

[src/router.ts](../../../src/router.ts) 不是平铺表，而是树形中间件栈：

- 最外层先走 `mwCaptcha`
- 然后是协议拦截 `res.agreement`
- 再走新手引导拦截 `res.guide`
- 之后才进入用户验证中间件 `mw`
- `mw` 下面再按“纯查询 / 交互 / 功能模块”继续细分

这意味着：

- 新正则写太宽，可能抢掉已有指令
- 放错层，可能被协议、引导、登录校验提前截住
- 同一组里插入位置不对，也会影响匹配结果

### 3.2 响应文件怎么组织

当前真实结构是：

- 指令文件放在 [src/response](../../../src/response) 下，按模块拆目录，例如：
  - [src/response/storage/newBag/props/res.ts](../../../src/response/storage/newBag/props/res.ts)
  - [src/response/market/sell/res.ts](../../../src/response/market/sell/res.ts)
  - [src/response/activityPoints/claimDaily/res.ts](../../../src/response/activityPoints/claimDaily/res.ts)
- 投影文件放在 [src/response-apps](../../../src/response-apps) 下，与指令目录同名或近名，例如：
  - [src/response-apps/storage/newBag/props/app.ts](../../../src/response-apps/storage/newBag/props/app.ts)
  - [src/response-apps/market/sell/app.ts](../../../src/response-apps/market/sell/app.ts)
  - [src/response-apps/activityPoints/claim/app.ts](../../../src/response-apps/activityPoints/claim/app.ts)

推荐判断方式：

- **只展示数据**：响应层做参数解析，投影层调接口，响应层再拼页面
- **涉及状态变更**：响应层只做指令解析、交互编排、结果回传；规则与写入由服务端 service 完成
- **涉及事务 / 幂等 / 发奖**：客户端只负责携带幂等键并调用接口，逻辑一律在服务端

### 3.3 响应处理器的基本骨架

最常见的骨架来自多个真实实现：

```typescript
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const uid = e.uid as number;
  const isPrivate = e.isPrivate ?? false;

  // 1. 解析命令
  // 2. 调 response-apps 投影（投影内部调 src/api/bot 封装的接口）
  // 3. 用 FormatGui 返回结果
});
```

参考：

- [src/response/storage/newBag/props/res.ts](../../../src/response/storage/newBag/props/res.ts)
- [src/response/market/sell/res.ts](../../../src/response/market/sell/res.ts)
- [src/response/activityPoints/claimDaily/res.ts](../../../src/response/activityPoints/claimDaily/res.ts)

---

## **4. FormatGui + Format 的标准落点**

### 4.1 `FormatGui` 负责最终页面拼装

[src/utils/messageHelper.ts](../../../src/utils/messageHelper.ts) 里的 `FormatGui` 已经把项目常用页面结构固化好了：

- 群聊场景自动 `@bid`
- 标题用加粗输出
- `header` 是标题下方的一行蓝字按钮
- `content` 吸收外部 `Format.createMarkdown()`
- `nav` 自动输出“第 X/Y 页 + 上/下一页”
- `footer` 是正文后的蓝字按钮
- `bar` 是底部 BT 按钮组
- 最后还会自动追加默认主导航：我 / 战 / 本 / 动 / 店

### 4.2 真实推荐写法

以 [src/response/storage/newBag/props/res.ts](../../../src/response/storage/newBag/props/res.ts) 为例，页面构建顺序是：

1. `const md = Format.createMarkdown()`
2. 先把正文、分页前内容、行内按钮写进 `md`
3. `const bar = Format.createButtonGroup()`
4. 底部操作按钮写入 `bar`
5. `message.send(FormatGui({ bid, title, content: md, nav, bar }))`

### 4.3 什么时候用哪一块

- **正文文本、行内按钮、列表内容** → `content`
- **顶部切换按钮** → `header`
- **正文后的返回/辅助入口** → `footer`
- **最后一行 BT 按钮** → `bar`
- **翻页** → `nav`

不要把底部 BT 按钮塞进正文，也不要把正文里的行内操作硬写到底部按钮区。

---

## **5. useSubscribe 怎么做连续交互**

### 5.1 什么时候需要它

当一个指令不是“一次输入立刻结束”，而是要继续追问玩家时，就看 `useSubscribe`：

- 交易上架先选物品，再输入数量、单价
- 宗门大比添加成员，展示列表后继续处理翻页或后续输入
- 修改邮箱、绑定邮箱、批量分解、悟道等也都用了同样模式

真实参考：

- [src/response/market/sell/res.ts](../../../src/response/market/sell/res.ts)
- [src/response/guildCompetition/addMember/res.ts](../../../src/response/guildCompetition/addMember/res.ts)

### 5.2 最常见的写法

```typescript
const [subscribe] = useSubscribe(selects);

const sub = subscribe.mount(
  async (event, next) => {
    // 处理后续输入
  },
  ['UserId']
);
```

当前仓里常见的关键点：

- 用 `['UserId']` 把后续输入绑定到当前用户
- 处理完毕后记得 `subscribe.cancel(sub)` 或走统一清理逻辑
- 要加超时取消，项目里常见是 60 秒
- 输入不合法时提示并 `next()`，继续等下一次输入
- 当你只想截住一部分输入、其他输入继续交给后续响应时，用 `next(true, true)`

### 5.3 `next(true, true)` 的真实作用

[src/response/guildCompetition/addMember/res.ts](../../../src/response/guildCompetition/addMember/res.ts) 里，分页订阅只处理 `宗门成员列表 2` 这类翻页输入：

- 如果匹配分页命令，就在订阅里重绘当前页面
- 如果不匹配，就 `next(true, true)`
- 这样输入会继续进入后续 `onResponse` 指令，不会被当前订阅吞掉

这类写法适合：

- 页面内翻页
- 页面内筛选
- 但同时要允许用户直接点别的按钮、输入别的独立指令

---

## **6. 三类开发链路**

### 6.1 查询型链路：先查，再格式化输出

推荐从 [src/response/storage/newBag/props/res.ts](../../../src/response/storage/newBag/props/res.ts) 往下看。

这条链路的真实顺序是：

1. 路由在 [src/router.ts](../../../src/router.ts) 匹配 `/储物袋 道具 ...`
2. 响应层解析子分类和页码
3. 从 `e.uid` 拿玩家 ID
4. 投影层调用 [src/api/bot/inventory.ts](../../../src/api/bot/inventory.ts) 里的接口封装
5. 服务端 `internal/service/**` 决定查什么、怎么分页、怎么过滤
6. 投影层把服务端 DTO 整理成页面需要的结构
7. 响应层用 `Format.createMarkdown()` 渲染列表，用 `nav` 和 `bar` 组装页面并发送

这类链路的边界很清晰：

- **响应层负责**
  - 解析文本
  - 处理空页、异常提示
  - 决定页面长什么样

- **服务端负责**
  - 查哪些表
  - 怎么分页
  - 怎么做二级分类过滤
  - 返回展示所需的事实与能力位

适合的场景：

- 背包
- 图鉴
- 排行榜
- 详情页
- 配置列表

### 6.2 提交型链路：响应层编排，服务端提交

推荐从 [src/response/market/sell/res.ts](../../../src/response/market/sell/res.ts) 往下看。

这条链路展示了项目里最典型的“多步提交”模式：

1. 首次指令解析出分类 / 物品 ID
2. 如果只是查看列表，直接查询并渲染
3. 如果进入提交流程，启动 `useSubscribe`
4. 订阅里分 `quantity` / `price` 两步收集输入
5. 最终由投影层调用 [src/api/bot/market-trade.ts](../../../src/api/bot/market-trade.ts) 的封装
6. 服务端 `internal/service/market_service.go` 在一个事务里完成上架与扣费
7. 响应层只负责把成功或失败结果显示出来

这类链路的关键经验：

- 交互状态存在响应层即可，不要提前写库
- 真正提交只发生在最后一步，且必须带幂等键
- 校验要分两层做
  - 客户端：是不是数字、是不是取消、是否超时
  - 服务端：是否可交易、数量是否合法、价格是否合法、事务是否成功

适合的场景：

- 上架、下架、购买
- 二次确认删除
- 输入数量/价格/目标对象
- 验证码、邮箱绑定、名称修改

### 6.3 奖励型链路：幂等键 + 服务端事务 + 发奖

推荐从 [src/response/activityPoints/claimDaily/res.ts](../../../src/response/activityPoints/claimDaily/res.ts) → [src/response-apps/activityPoints/claim/app.ts](../../../src/response-apps/activityPoints/claim/app.ts) → [src/api/bot/activity-points-claim.ts](../../../src/api/bot/activity-points-claim.ts) → 服务端 `internal/service/**` 里同域的领取 service。

真实顺序是：

1. 响应层解析 `/领取日常活跃奖励 30`
2. 投影层调用接口封装，请求体带 `requiredPoints`，并附上 `writeContext(request)` 得到的幂等键
3. 服务端在事务内做资格校验（是否已领取、活跃度是否达标）
4. 服务端在同一事务里发奖并写入领取记录
5. 服务端返回结算回执
6. 响应层只展示服务端给的结果

这就是当前仓里最稳定的奖励链路模型：

```text
客户端解析
→ 携带幂等键调用接口
→ 服务端幂等 / 并发保护
→ 资格校验
→ 事务发奖
→ 记录领取
→ 返回结算回执
→ 客户端 GUI 回包
```

当任务涉及：

- 签到奖励
- 兑换奖励
- 活动奖励
- 里程碑奖励
- 首次领取或重复领取保护

优先照这个模式做：客户端不碰余额表、不碰物品表、不碰 Redis。

---

## **7. 改接口：契约与服务端要一起改**

### 7.1 客户端契约长什么样

客户端契约在 [src/api/domains](../../../src/api/domains) 下按域拆分，每个域有：

- `operations.ts`：operationId、method、path、安全方案、参数位置
- `types.ts`：请求与响应类型
- `index.ts`：绑到 `APIClient` 的方法
- [src/api/registry.ts](../../../src/api/registry.ts)：汇总所有域，导出 `OperationId` / `Operations`

调用统一走 [src/api/bot/client.ts](../../../src/api/bot/client.ts) 的 `requestBackend(bid, operationId, ...)`。

### 7.2 新增或修改接口的完整步骤

1. **服务端先定义规则与接口**
   - 规则、数值、结算：`../xiuxian-game-server/internal/service/**`
   - 需要战斗计算时：`../xiuxian-game-server/internal/battle/**`
   - 需要定时 / 补偿时：`../xiuxian-game-server/internal/worker/**`
   - 路由注册：`../xiuxian-game-server/internal/httpapi/**`
   - OpenAPI 契约：`../xiuxian-game-server/docs/openapi.yaml`

2. **客户端补契约**
   - 在对应的 `src/api/domains/<domain>/operations.ts` 加 operationId 与参数描述
   - 在 `types.ts` 加请求 / 响应类型
   - 在 `index.ts` 挂上方法

3. **客户端补接口封装**
   - 在 [src/api/bot](../../../src/api/bot) 下新增或复用一个 `<domain>-*.ts`
   - 封装里负责：路径参数、查询参数、请求体、幂等键、返回值校验（字段缺失就抛错，不要静默兜底）

4. **更新迁移台账**
   - 服务端 `../xiuxian-game-server/docs/api-coverage.json` 里对应的 Node 入口条目要补上 operationId
   - 新增 / 删除客户端指令入口时，台账与 [src/router.ts](../../../src/router.ts) 必须同步，否则服务端的覆盖率测试会失败

### 7.3 本地检查

先按 `AGENTS.md` 执行 `tsgo`，再执行 `yarn lint:fix`。按改动范围运行 `yarn build` 或相关测试。接口改动还需核对 `/api/v1/internal/...` 等实际路由、客户端调用和 OpenAPI；迁移台账由服务端 `make docs-check` 检查。其他命令先确认当前 `package.json` 中存在。

> 服务端侧对应的是 `go build ./...`、`go vet ./...`、`go test ./...` 与 `make docs-check`。

---

## **8. 类型与共享逻辑放哪里**

### 8.1 客户端类型

- 跨指令、跨域共享的展示类型放 [src/types](../../../src/types)，例如 [src/types/battle.ts](../../../src/types/battle.ts)、[src/types/skillBook.ts](../../../src/types/skillBook.ts)
- 接口请求 / 响应类型放对应域的 `src/api/domains/<domain>/types.ts`
- **业务规则的数据结构（表结构、字段映射、关联）不在客户端**，它们在服务端与共享的 DB SDK 里

### 8.2 数值常量

- 纯展示常量（文案、分类标签、权限位含义）可以放 [src/constants](../../../src/constants)
- **玩法数值的第一来源是服务端**：境界、掉落、冷却、收益、限购等都要在服务端 service 与其配置里确认
- 不要为了客户端方便把服务端数值抄一份到 [src/constants](../../../src/constants)；两份数值一定会漂移

---

## **9. 易错点**

### 9.1 最容易混的点

- **`bid` / `uid` 混用**
  - `bid` 给 `FormatGui`，也作为 `X-Bid`
  - `uid` 作为接口的 `path.id`

- **把规则写进客户端**
  - 在投影层或响应层“顺手算收益 / 判资格”，等于把服务端规则复制了一份
  - 正确做法是把这类判断加进服务端 service，并让接口返回结论

- **把写操作做成自动重试**
  - 写操作失败应当如实展示，让玩家自己决定是否重试
  - 幂等键只保证“同一条平台消息不会重复执行”，不是让客户端无限重试

- **奖励直接手改数据**
  - 客户端没有任何表可改；所有发放与流水都在服务端
  - 服务端已有统一发放入口，能复用就不要拆出第二套

- **接口改了但契约 / 台账没同步**
  - 漏客户端契约：`yarn typecheck` 报错
  - 漏台账：服务端覆盖率测试失败

- **连续交互没做超时和取消**
  - 订阅不清理，用户体验和后续指令匹配都会出问题

- **错误地吞掉后续指令**
  - 只想处理分页或局部输入时，记得看 `next(true, true)` 的用法

### 9.2 UI 层面的固定约束

- BT 只放最后一行，适合底部主操作
- 文本内部蓝字按钮走 `Format.createMarkdown().addButton(...)`
- 页面标题优先通过 `FormatGui({ title })` 输出
- 一般优先 `FormatGui + Format`，不要同页混太多旧风格输出

---

## **10. 常用 Yarn 命令**

命令来源于 [package.json](../../../package.json)：

| 命令                | 用途                        |
| ------------------- | --------------------------- |
| `yarn dev`          | 本地开发启动                |
| `yarn build`        | 构建产物                    |
| `yarn typecheck`    | TypeScript 类型检查         |
| `yarn lint`         | 校验 `src` 下 TS/JS 代码    |
| `yarn lint:fix`     | 自动修复 ESLint 问题        |
| `yarn format:check` | 检查全仓格式，包括 Markdown |
| `yarn format`       | 执行格式化                  |

代码改动后按 `AGENTS.md` 的顺序执行：

```bash
tsgo
yarn lint:fix
```

如改动接口契约或指令入口，再核对服务端路由、OpenAPI 与迁移台账，并执行服务端现有的相关测试及 `make docs-check`。

---

## **11. 开发时的最短决策路径**

当你接到一个“新增功能”任务时，按这个顺序判断最快：

1. **先问：这是新规则，还是把已有能力接进新指令？**
   - 新规则 / 新数值 / 新结算 → 先改服务端 `../xiuxian-game-server/internal/service/**`
   - 只是新指令 → 直接看第 3 步
2. **服务端是否有现成接口？**
   - 有 → 直接用；没有 → 先补服务端接口、OpenAPI 与迁移台账
3. **在 `router.ts` 找同模块已有指令，确认挂载层级**
4. **在 `src/response-apps` 找最近的投影，在 `src/response` 找最近的同类页面，照它的风格写**
5. **接口调用统一走 `src/api/bot/*.ts` 的封装，不要在各个 res.ts 里各写一份**
6. **涉及领取 / 购买 / 兑换时，写操作必须带幂等键，并把规则留在服务端**
7. **最后依次跑 `tsgo`、`yarn lint:fix`，再做改动所需的验证**

如果你按上面这条路径落地，基本就不会偏离当前项目真实实现。
