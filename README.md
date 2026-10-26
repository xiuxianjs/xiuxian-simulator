# 修仙机器人

本项目是基于 AlemonJS 的修仙文字消息游戏机器人。机器人接收聊天平台指令，处理交互与气泡排版，并通过 HTTP API 向 Go 游戏服务查询和提交操作；游戏规则、状态变更与结算以服务端为准。

必要环境：`nodejs`、`redis`、`chrome`。运行游戏服务还需按服务端仓库的要求配置 MySQL、Redis 和 API 身份凭证。

该扩展推荐使用`alemongo`作为生产环境

https://github.com/lemonade-lab/alemongo

## 安装

> 安装后使用 `/帮助` 唤醒

### alemongo

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

## 机器人配置

将 [alemon.config.example.yaml](./alemon.config.example.yaml) 的 `xiuxian-game` 配置段合并到运行目录的 `alemon.config.yaml`，保留已有平台凭证、MinIO 等配置。源码通过 AlemonJS `getConfig().value` 读取，游戏配置不再读取 `.env` 或 `XIUXIAN_*` 环境变量。修改后重启机器人。

机器人组合业务（含主页）固定调用 V2 接口，不提供版本切换配置；请求失败直接结束，不重试 V1。后端保留的 V1 兼容接口不参与机器人组合业务调用。机器人 res 可以直接调用公共 API 执行器。

必填 `xiuxian-game.backend.api_url`（仅 origin，不加 `/api/v1`）、`robot_auth_token`（对应 Go `ROBOT_AUTH_TOKEN`）和 `worker_token`（对应 Go `WORKER_AUTH_TOKEN`）。任务移交开关须与 Go 服务配置一致。Go 服务本身继续使用它的环境变量配置。

### 渠道机器人接入

普通服沿用上面的配置。渠道模式使用商户签发的 BOT_TOKEN，每个运行实例配置一个 QQ AppID；同一商户的多个机器人分别配置各自的 Token / AppID。渠道游戏服与正式服独立，所有商户共享渠道世界。

```yaml
xiuxian-game:
  backend:
    api_url: 'https://channel-game.example.com'
    channel_mode: true
    channel_bot_id: '123456789' # 与本实例 QQ 平台配置的 AppID 一致
    robot_auth_token: '<BOT_TOKEN>'
    worker_token: ''
    api_timeout_ms: 60000
```

渠道地址只接受 HTTPS origin，本机测试可用 `http://127.0.0.1:端口` 或 IPv6 回环 IP，不附加路径、查询、账号或片段。进入事件生命周期和游戏 API 调用前校验当前平台 / AppID，防止混合平台配置将另一机器人的玩家注册到当前 Token 下。通知 relay、缓存和 SSE 发送 Bearer BOT_TOKEN，不使用 Worker Token 回退；渠道通知传输拒绝重定向。

渠道模式只认领当前机器人的玩家通知与群批次，不领取全服 `platform.message.dispatch`。SSE 协议、私聊 / 群通知权限、发送成功后 ack 和服务端重试规则保留；连接重建会重新读取配置。重置 Token 后更新配置并重启实例。

游戏 API main 和独立 Worker 已支持显式 `GAME_MODE=channel`，须先按游戏服务的 `docs/channel-game-startup.md` 配置独立 MySQL / Redis、实例引用及桥接凭据；普通服不会自动接受商户 Token。聊天运营接口、联系人观察和每日机缘管理尚未适配渠道权限，渠道模式暂停聊天观察 / 投递，并拒绝全服运营接口调用；每日机缘玩家领取仍走游戏组合业务。不能将当前版本视作完整渠道新服已上线；玩家 / 充值同步与 5% 分佣账本仍需完成。

## 定时任务与消息投递

目标职责是由 Go Worker 调度游戏周期任务、计算和持久化结算结果；机器人只负责指令交互及依赖聊天平台 SDK 的消息投递。机器人不应另行计算奖励、冷却、到期或其他游戏规则。Go Worker 把需要主动发送的消息写入持久事件；机器人通过专用 SSE 收到唤醒后向内部通知中继认领事件，发送后回报投递结果，失败时由服务端安排重试。平台投递不再注册固定周期的机器人任务。

所有游戏定时任务由 Go Worker 调度和结算，机器人通过 SSE 接收通知并执行平台投递。机器人无需配置调度移交开关。

机器人使用带 `X-Worker-Token` 的 `/api/v1/internal/notification-relay/events/stream` 专用 SSE。`stream.ready` 表示连接或重连后应补领未确认事件，`notification.ready` 表示新事件或延期重试已到期；心跳不触发认领。通知载荷不进入 SSE，仍由 `claim`、`ack`、`retry` 和事件回执保障持久化、租约恢复与失败重试。SSE 断开时机器人按退避间隔重连，不启动定时领取。服务端现有 `/api/v1/players/:id/events/stream` 仍只面向 App 实时状态。

本地代码检查依次运行 `tsgo`、`yarn lint:fix`。后者会修改源码，执行前请确认工作区改动。

## 请求链路与耗时排查

前置处理器在同一条消息内复用身份查询结果，不跨消息缓存身份。注册成功后清除当前消息的身份结果；各业务接口仍由 Go 校验归属。属性页复用入口 UID，私聊通知地址登记不阻塞当前指令。

排查卡顿时可在 `xiuxian-game.backend` 中设置 `log_api_timings: true`。日志记录操作 ID、请求 ID、耗时和成功/失败，不记录凭证、玩家身份或请求体。默认只记录耗时至少 1 秒的 API 请求。API 耗时不包含图片渲染、上传及聊天平台消息发送，不能当作玩家端总响应时间。

业务调用未显式传入请求 ID 时，默认继承当前 AlemonJS 事件的追踪 ID，方便关联 API、图片与发送阶段；显式 ID 保持优先。追踪不会自动生成写操作的幂等键，日志写入异常也不会改变业务结果。

支持新后端时，机器人通过 `/api/v1/robot/command-entry` 一次取得匹配指令所需的前置回执。普通查询随后只调用业务接口；公共帮助不执行玩家资源恢复，未匹配指令和任务转义不执行普通指令计数。引导、验证码、禁言、维护或资格拦截会停止后续阶段，仍使用原气泡排版。

战斗等路由的匹配、闭关、打坐检查通过可选 `guards` 合并进入同一入口，按原路由顺序短路，后续业务仍由服务端校验。应先部署接受此字段的 Go 后端，再更新机器人；旧机器人不传此字段仍可使用新后端。若旧入口明确在执行前拒绝新增参数，机器人会使用原请求和三项独立检查，30 秒内不重复探测扩展字段；其他 400、超时和无效响应不会触发此重试。业务应用在当前 AlemonJS 事件内读取本人身份时也复用入口结果，查询其他玩家和事件外调用不共享该缓存。

先部署支持该接口的 Go 服务，再重启新机器人。只有明确的 404/501 才兼容旧接口，并在 30 秒内避免重复探测；超时、断线及无效响应不会切换旧写接口重试。没有平台消息唯一标识时保留原流程。该接口依赖现有 API 幂等回执表，不新增数据库结构。

图片缓存现在合并同一内容指纹正在进行的渲染和上传；不同状态不共享任务，失败后释放任务且不自动重试。属性页和公共缓存渲染工具均使用此机制。

MinIO 同一桶正在执行的存在检查及创建也由并发上传共享；检查成功后复用已有缓存，失败后释放检查任务，后续新请求可重试。不同图片仍分别上传，不能把桶检查合并当作图片内容合并。

`xiuxian-game.backend.log_transport_timings: true` 记录图片渲染、上传和平台发送阶段；非生产环境默认仅记录耗时至少 2 秒的阶段。`NODE_ENV=production` 时统一关闭 `[传输耗时]` 和 `[后端请求耗时]`，包括主页自动计时及慢请求记录，开启上述配置也不会输出；错误和警告日志保持原样。统一 `useMessage` 包装等待 SDK 发送 Promise 完成后记录耗时，即使调用方使用 `void send(...)`。`elapsedFromEventStartMs` 从本应用事件入口到该阶段完成，不包含 QQ 上游排队，也不证明玩家已读；`fulfilled` 只表示 Promise 正常返回，发送是否成功仍以 SDK 回执 code 为准。

开启 `xiuxian-game.backend.log_api_timings: true` 或 `log_transport_timings: true` 时，`[指令入口模式]` 以 `mode: legacy` 和 `reason` 区分 `missing_event_id`、`endpoint_not_supported`、`unsupported_endpoint_cooldown`，同事件与原因仅记录一次。使用 `eventTraceId` 关联事件；缺消息 ID 时，同账号不同事件的 `requestId` 可能相同。正常已注册、已有存档且引导结束、未被拦截的查询分支在旧服务端为聚合入口加业务查询共 2 次请求；支持内联目录且成功同事件复用时为 1 次请求。缺事件 ID 时旧流程为 6 次，首次 404/501 不支持探测后为 7 次，30 秒冷却期内为 6 次；后台通知登记另计。超时与 500 错误不会进入此回退。实际请求序列与时间偏移应结合全部 API 计时判断，这些次数不适用于所有拦截或引导分支。

## 主线 / 商店对比采样

现有配置只需合并两项，保留现有所有其它配置和凭证：

```yaml
xiuxian-game:
  backend:
    log_api_timings: true
    log_transport_timings: true
```

由现有机器人启动流程加载配置，不要另启动第二个机器人。默认关闭时只记录 >=1 秒阶段，不能拿这种阈值日志估算完整 p50/p95。采样完成恢复原开关。

两个开关必须是布尔值 `true`，字符串 `"true"` 不会开启全量计时。阈值按单个阶段判断，总交互超过一秒不保证入口、业务或发送均有日志；分析器有可用发送终点也不代表正常两次 HTTP 已完整记录。对比前检查同一事件的实际请求路径：旧路径应有入口、业务 GET 和发送；支持内联目录的服务端在入口成功后每次回复重新读取目录，同事件完整参数匹配并通过原 DTO 校验后记录安全的 `[目录复用]`（`outcome: reused`）。此时通常只有入口 1 次 HTTP，没有业务 GET 日志属于正常情况，入口 HTTP 耗时包含目录投影；用同 requestId 的服务端 access log `command_reply_projection_ms` 拆分投影耗时。`[目录复用]` 留在原始日志，不属于归一化阶段区间，不能据此补造时间。目录缺失、参数不匹配或校验失败继续原 GET，入口不会为目录自动重发。缺失阶段及未覆盖间隙仍保持未知。

手动交替发送 `/查看主线` 与 `/商店`，不附 UID、令牌或额外参数。建议各收集至少 30 条，首条冷启动与持续热路径分别保存；小样本 p95 仅作观察。确保账号已经注册且新手引导完成；验证码、禁言、维护等拦截仍按原流程执行，不能为了测量跳过。既没有业务 GET，也没有成功 `[目录复用]` 记录的样本，不能仅凭入口和发送日志当作正常完整查询。

以下命令仅读取指定容器日志，不发送消息；把 `YOUR_BOT_CONTAINER` 替换为实际机器人容器名。在机器人仓库执行，可直接使用：

```sh
umask 077
docker logs --since 10m --timestamps YOUR_BOT_CONTAINER > /tmp/bot-timing-raw.log 2>&1
node tools/normalize-bot-timing-logs.mjs /tmp/bot-timing-raw.log /tmp/bot-timings.jsonl
node tools/analyze-bot-timings.mjs /tmp/bot-timings.jsonl /tmp/bot-timing-analysis.json
```

原日志可能包含其他模块信息，留在本机。归一化输出仅保留安全计时字段；转换的 `droppedBlocks` 非零时先看采集是否截断或交织，不尝试补全归属。当前多行格式若含未来新增字段会保守丢弃，避免误解。不要拼接不同进程或重启前后的日志为单次采样；可分别分析同样窗口。

查看分析结果：

```sh
node --input-type=module - /tmp/bot-timing-analysis.json <<'JS'
import fs from 'node:fs';
const result = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
console.log(JSON.stringify({
  diagnostics: result.diagnostics,
  exactOperations: result.operationStatistics.commands,
  commands: result.commands.filter(x => ['storyline.list', 'shop.list'].includes(x.commandKey)).map(x => ({
    commandKey: x.commandKey,
    events: x.correlatedEvents,
    excluded: x.excludedFromEndpointStats,
    processorToLastObservedSendPromise: x.processorToObservedLastSendAttemptEnd,
    byEventKind: x.endpointStatsByEventKind,
    phasesByEventKind: x.observedSendWindowPhaseDistributionsByEventKind,
    entry: x.observedSendWindowPhaseDistributions.entry,
    business: x.observedSendWindowPhaseDistributions.business,
    routeImport: x.observedSendWindowPhaseDistributions['route-import'],
    build: x.observedSendWindowPhaseDistributions['response-build'],
    send: x.observedSendWindowPhaseDistributions['send-attempt']
  }))
}, null, 2));
JS
```

`operationStatistics` 按精确 `operationId` 分别统计每个事件、命令及事件类型。旧 `business` 桶保留兼容口径，可能包含旧流程的身份、引导、验证码和入口检查，不能当作纯商店或主线查询耗时；应分别查看实际出现的入口操作与 `get_players_id_shop_products` / `get_players_id_storyline_catalog`。不会仅凭接口 ID 推断已发生兼容回退，需结合 `[指令入口模式]` 与 timeline。无起点时 union 保持 null，单次请求 duration 只作独立观测；请求重叠不能相加，发送窗口只裁到最后一次已观测发送结束。

`medianMs` 是 p50；`p95Ms` 用 nearest rank。各阶段附自己的样本数：入口/业务/send 数量不同表示部分事件缺阶段，不能直接拿不同样本集合的中位数相加。阶段区间各自取 union，可跨阶段重叠；总覆盖也取 union。兼容字段 phaseDistributions/unionMs 包括本事件所有已观测 span（可能含发送后的工作）。上面的示例使用新增 observedSendWindowPhaseDistributions，先将区间裁到 processor 起点至最后一次已观测发送结束，再按阶段取 union。尾部任务因此不会成为该窗口的正耗时瓶颈。仍须结合 timeline、缺阶段及最后发送边界，不推断用户已见。

当前主线和商店正常回复走 Markdown，render/upload 不出现可属正常；它们不能补记成 0 或以其它命令图片时长代替。入口 API span 包括机器人到 Go 的整个 HTTP 时间，无法仅凭 bot 日志拆分 SQL/Redis；需要同 requestId 的服务端阶段日志再归因。

主线和商店另记录同步 `response.build`，覆盖 Markdown 与 `FormatGui` 构建，归一化与分析结果归入 `response-build`，与随后 `platform.send` 分开。该阶段不包含接口返回后的 schema 校验和 App 数据投影；未覆盖间隙仍需单独定位，不能全部算成构建或平台发送耗时。原有 `void message.send` 保持不等待，构建计时结束后才开始发送计时。

两个路由的原动态导入闭包另记录 `route.import`，分析结果归入 `route-import`，覆盖处理器执行前的模块加载与求值等待。冷、热请求均保留原导入路径及模块缓存行为；热路径也可能有计时很短的 span。它不包含导入前的匹配、入口检查或上游按钮确认，不覆盖业务 GET 后的数据解析。旧日志缺少此阶段时保留缺测，不能推断为零或认定导入就是生产延迟原因。

当前 `/商店` 与 `/查看主线` 的基础查询入口配置相同，正常路径没有商店专属补查询；两种列表只构建 Markdown 和按钮，不触发 Image 媒体上传。比较两者时仍需分别统计入口、业务 GET、构建、平台发送和事件偏移间隙，源码请求数不能解释生产中数秒的差异。`mwFeatureTrack` 在响应处理前登记使用事件，并以当下 `Date.now()` 调用分析上报，其 `response_time_ms` 通常接近零、`success` 也不是平台投递回执；不要用这两个字段判断完整交互耗时或发送成功，应使用关联的传输计时日志。

新日志另含固定 `eventKind`：标准 `FormatEvent.name` 的消息事件映射为 `message`，按钮交互映射为 `interaction`，其他及旧日志为 `unknown`，不记录原始事件或身份字段。分析报告保留每个事件类型，并在每个命令的 `endpointStatsByEventKind` 中分别输出样本数、中位数及 p95；同一事件出现矛盾类型时排除其端点统计。先比较相同类型的主线与商店样本，避免混合输入指令和点击按钮。

同类型的阶段比较使用 `observedSendWindowPhaseDistributionsByEventKind`（示例中的 `phasesByEventKind`），分别输出消息、按钮交互和未知类型的各阶段统计；原 `observedSendWindowPhaseDistributions` 仍汇总所有类型。两者均只使用可关联的发送窗口，缺测阶段不补零，矛盾类型样本不进入端点或窗口阶段统计。应比较同一种输入方式，不能用消息的入口时长对比按钮交互的发送时长。

当前正常处理顺序是入口检查、目标路由模块导入、业务 GET、接口校验与 App 数据投影、回复构建、平台发送。HTTP 内的 JSON 解析包含在 API 计时中；GET 返回后的同步校验与投影尚未独立计时，普通主线和商店页最多五条且没有逐条异步请求。业务结束到构建开始的未覆盖间隙也可能包含事件循环调度，源码不能据此解释商店额外两秒，需先看关联日志是否确有明显间隙。

已安装 QQ 适配器的 WebSocket、webhook 共用交互注册流程：默认自动确认会在交互类型 11/12 时先等待 `PUT /interactions/:id`，再交给 processor。该等待不在现有事件起点或 `platform.send` 内；框架 `Timestamp` 也在确认后构造，不能据此补算确认耗时。本次分类没有修改 SDK、确认顺序或发送行为，是否存在慢确认仍需平台侧证据。

起点是本应用 processor hook；上游 QQ 收到与排队时间不可见。终点是最后一条已观测 send Promise 尝试结束，不证明所有发送结束或用户屏幕显示。fulfilled 也可能包含 SDK 失败回执，分析器不读取回执。handler return 不作为发送完成。

### 本地测试 `/我的资料` 耗时

非生产环境下，主页指令及其别名自动输出本地 logger 计时，不需要开启耗时配置；短步骤也记录，单位为毫秒，保留三位小数。日志标记为 `[传输耗时]` 或 `[后端请求耗时]`，使用 `eventTraceId` 关联同一轮事件，`requestId` 对应消息的后端请求。

| stage                                                              | 测量范围                                                               |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `event.received` / `home.route.enter`                              | 事件进入应用及精准路由处理器开始；两个偏移之差包含路由前的框架处理     |
| `home.route.import`                                                | 主页处理器加载，包括首次模块加载                                       |
| `route.task-panel` / `route.task-escape`                           | 实际进入这些前置处理器时的任务入口处理；未命中不会执行                 |
| `home.task.compatibility` / `home.platform.compatibility`          | 任务、平台兼容检查                                                     |
| `home.identity.input` / `home.api.input`                           | 本地身份参数检查、构造 API 上下文                                      |
| `api.client.create` / `api.sdk.prepare`                            | HTTP 客户端创建、请求参数及请求体准备                                  |
| `api.http.wait`                                                    | HTTP 请求到完整响应体返回，包含网络等待及后端全部执行时间              |
| `api.sdk.response` / `api.json.parse` / `api.sdk.envelope`         | 响应元数据处理、JSON 解析、通用返回契约检查                            |
| `home.response.validate`                                           | 组合分支及主页 DTO 校验                                                |
| `home.api.total`                                                   | 主页 API 完整调用，包含上述请求及解析阶段                              |
| `middleware.identity.seed` / `middleware.feature.track`            | 保存本次身份、提交本地功能统计入口；统计入口耗时不代表异步统计完成时间 |
| `home.branch.dispatch` / `middleware.parent.next`                  | 返回分支处理及向父级 next 移交的时刻                                   |
| `middleware.task-tail.total` / `middleware.fallback.total`         | 后置任务入口和中间件兜底实际执行时间                                   |
| `middleware.mute` / `middleware.guide` / `middleware.player-entry` | 本地禁言、引导、玩家入口回执展示；包含内部等待发送的时间               |
| `middleware.reply.render`                                          | 其他中间件反馈构建与发送                                               |
| `home.view.model` / `home.bubble.build` / `home.bubble.error`      | 主页展示数据转换、正常或失败气泡构建                                   |
| `home.handler` / `event.processor.finished`                        | 主页处理器耗时、框架结束时刻；异步发送可能晚于它们完成                 |
| `platform.send`                                                    | 平台 SDK 的 send Promise 完成时间，不能当作用户实际收到消息的时间      |

`durationMs` 是当前阶段耗时，`startedFromEventStartMs` 和 `elapsedFromEventStartMs` 是相对事件开始的偏移。`outcome: checkpoint` 仅表示时间点，耗时为零。总阶段与子阶段相互包含，不要把全部 durationMs 相加。机器人日志无法单独测出后端每次 SQL、Redis 或准入阶段的耗时，也不覆盖消息到达应用前的平台排队时间。计时仅写本地日志，不上报或增加诊断 API 请求。
