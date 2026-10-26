# 项目框架测试

项目使用 `alemonjs/testing` 运行真实机器人处理器、Hook、Format、路由与 Context。新增测试直接导入 TypeScript 源码；历史展示测试通过公共适配器保留原有业务夹具和消息断言。

```sh
yarn test                         # 无需 Go 夹具的默认测试
yarn test:framework               # 完整框架测试，包含真实 Go 测试夹具
yarn test:framework:types         # 直接框架测试的类型检查
yarn test:framework:audit         # 校验迁移清单、旧事件绑定和伪造消息 Hook
node tools/run-framework-tests.mjs --filter=checkin
```

在 Node.js 22.22.3、`alemonjs 2.1.112` 上验证。`tsx` 是直接开发依赖。运行器按两个子进程并发执行，每个文件最多运行 120 秒，默认关闭测试日志落盘，失败仍以 Node TAP 报告。可通过 `LOG_LEVEL`、`LOG_FILE` 调整日志。

## 覆盖与分层

- `migrated-files.json` 登记 205 个已接入测试工具的历史运行时测试文件。审计命令会检查重复项、遗漏文件、直接 `withEventContext` 绑定和伪造 `useMessage`。
- 其中 176 个文件依赖隔离 Go 夹具，29 个不依赖。`test/framework/*.test.ts` 是直接使用新版工具的示例及适配器验证。
- 纯业务单元测试、SDK/API 契约测试保留原有用途，没有为了统一工具强制改写。需要 Go 提供环境的 `onboarding-http-bridge.mjs` 仍由对应的 Go 集成测试驱动，不纳入离线框架命令。
- 完整入口要求相邻 `../xiuxian-game-server` 和 Go 工具链。每轮将 `internal/httpapi`、`internal/service` 中所需的包各编译一次到临时目录，再按原来的 `-run` 条件分进程运行，并在结束后删除二进制。不会把模拟 JSON 当作真实 Go 输出缓存。单独运行测试文件时自动回退原来的 `go test`。

实际业务代码和数据库结构没有为这次测试迁移调整。测试中出现的服务端奖励、限制和结果来自原有夹具，不能据此声称真实服务结算或 QQ 投递通过。

## 新测试写法

参考 `checkin.test.ts`、`onboarding.test.ts` 和 `message.test.ts`：

1. 用 `createTestApp()` 创建实例，在 `t.after` 中 `dispose()`。
2. `runHandler` 执行完整响应处理器；路由和全局中间件使用 `mount` + `dispatch`。
3. 用 `invoke` 打开真实 Context，`clock.advance` 推进框架时间。
4. 通过 `result.messages` 检查文字和节点，通过 `result.actions[message.actionIndex].results` 检查回执。

`.commands` 只收集命令按钮。QQ `type: 'call'` 回调按钮需要检查 `.nodes` 中的 data、版本 ID 和用户权限。消息数组记录发送尝试，数组非空并不表示发送成功。

`fixture.ts` 提供回环地址的模拟后端响应，实际执行项目 HTTP SDK、解析器、`useMessage` 包装和气泡构造。测试不读取生产 YAML，也不连接真实 QQ。

## 历史测试适配

`test/helpers/framework-presentation.mjs` 是过渡工具：

- `run(handler, event, next)` 执行真实处理器和事件选择，在平台动作处捕获原始节点，供原来的 `state.sent` 断言使用，同时暴露真实 `TestRunResult`。
- `invoke(event, callback)` 用于直接业务回调；新用例优先使用完整处理器，不继续扩展手写 `.current()` 调用。
- 不补造缺失的 `BotId`、`ChannelId` 或 `Target`，避免改变拒绝分支的契约数据。
- 其他平台动作仍默认报错；需要提及信息的夹具显式传入 `{ mentions: [] }`，不将意外动作默认为成功。
- 多轮原生轮询可使用 `{ persistent: true }`、`invokeLast`，在下一轮场景前显式 `dispose()`；套件结束也会释放剩余实例。
- 存量消息节点比较和服务端原始断言保留。历史业务依赖仍可使用 esbuild 隔离；消息 Hook 本身已改为真实实现。后续逐个模块改写时，优先取消打包和全局状态，直接断言测试结果。

框架虚拟时钟不管理原生业务定时器。签到埋点的原生 `setTimeout` 在串行套件中使用 Node `mock.timers` 暂停并重置，不代表埋点刷新已验证；Node 22 会显示 MockTimers 实验性提示。原生订阅/轮询回调需要在实例上下文内触发，避免实例释放后继续发送。

## 验证状态

当前结果和已确认的历史失败见 `adoption-status.json`。命令不会跳过历史失败来制造通过结果。灵田首页的动作显示、历史气泡对照及旧夹具依赖漂移等失败，应与测试工具接入问题区分处理。

节点和文字断言不等于平台最终排版；Go 隔离夹具也不等于真实数据库及线上账号验证。
