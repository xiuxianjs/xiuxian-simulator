# 应用级指令策略迁移（2026-11-05）

## 范围与配置

使用当前已安装的 AlemonJS 2.1.123。进入任务前 package.json、yarn.lock 与 router.ts 已有未提交改动；保留原有依赖升级，不重置它们。部署配置见根目录 alemon.config.example.yaml；真实 alemon.config.yaml 未修改。

新版 apps.xiuxian-game.command 优先于旧 commandPrefix / routeText.allowBare，支持 prefix、space 与 format.enabled/match/replacement。旧配置保持兼容。原始处理器、Go API 与确认凭据继续使用 /指令契约，不修改游戏规则与数据。

## 实现

- Router DSL 使用当前原文进行匹配；不再先剥离前缀再交给框架造成二次校验失败。
- 普通 res 在框架匹配后通过 legacyCommandHandler 适配旧业务解析；Hook 与参数 next 放行前恢复公开文本，保留参数并防止重复放行。
- 插件消息工具在新模式下保留源按钮，由框架发送管线统一转换。普通按钮、MD.button、引用块、全局键盘和标准 OutgoingMessage 键盘均接入。
- commandTarget 显式设置时交给框架处理；link、call、callback 不参与插件前缀改写。
- 配置匹配的特殊源格式不被额外加斜杠。显式传入前缀的 commandText 调用仍为纯转换，避免测试/辅助调用意外启动全局配置监听。
- 旧版裸指令与自定义前缀兼容；新模式严格遵循 space 和强制前缀，未知消息继续传给其他插件。

## 凭据与边界

按钮预算使用转换后的完整 Unicode 字符数，超过 80 拒绝生成，不截断、不补齐、不改变签名。示例默认前缀为 /，原因是炼丹 b3 确认已占满 80 字符；/修仙 等更长前缀不能保证全部长凭据操作可用，需要短前缀或服务端短引用。主动后台消息必须具有 xiuxian-game 应用上下文；本次未执行真实 QQ 投递。

## 验证

- tsgo --noEmit：通过。
- yarn lint:fix：通过。
- yarn test:framework:types：通过。
- yarn build：通过。
- git diff --check：通过。
- 五个迁移相关测试文件联合运行：85 项全部通过（native-command-policy、command-prefix、default-prefix-compat、customer-support-router、onboarding-runtime）。包含真实框架挂载、消息发送回执与本地 HTTP 业务往返。
- 全量离线运行曾为 8105 项、8093 通过、11 失败、1 超时。其中 3 项旧路由测试已调整为真实 matcher/处理器验证并纳入上述通过的 85 项；未在这些修正后再次重跑全量，不能宣称全量通过。

尚未解决的全量失败：conversation-play-context 的两项引导会话 flow 断言；fishing-packages-payment 的两项分隔线断言；guild-review-layout 的引用行布局断言；notification-failure-isolation 的两项队列调用次数；official-group-config 的群链接按钮断言。notification-permission-probe 文件超时。这些业务或展示实现本次未修改，但尚未通过独立基线对照完成归因，因此不声称全部是历史问题。

未执行部署、真实账号或真实平台验证。旧线上配置不会被自动切换。

## 2026-11-06 执行链修正

复盘确认并修复：自定义应用前缀下，DSL 将原文改为 /指令后，成功的 middleware 分支无法进入兜底回执；旧自定义前缀的 res 因 entry.regular 不再公开而没有转换业务文本。

现在 DSL 注册 importer 与 res importer 共用 legacyCommandHandler，框架先匹配原文，再在处理器执行期间提供 /指令。参数 next 保留内部链路语义，Hook next 保留外层链路语义，二者都在继续之前恢复外部文本；正常结束和异常也恢复，已交给下游后不再次覆盖下游状态。移除分组中的公共事件改写和外层末尾 restore，保留事件守卫、未知消息放行以及注册元数据。

新增三种应用前缀的真实 middleware 拒绝回执往返，以及 **、++、允许裸指令三种旧配置的真实客服 res 回归。联合五个相关文件共 91 项通过；类型、Lint、测试类型及构建通过。前述全量遗留失败本次未重跑，不将此次定向通过视为全量通过。

## 2026-11-06 Context、文字提示与输出预算边界

- 隐式应用前缀校验现在读取 space；教学 Context、装备/功法分解订阅及手动战斗订阅不再接受路由拒绝的空格形式。显式传入前缀的纯函数兼容路径保持无隐式全局配置读取。
- 教学 Context 在旧版本放行之前恢复原始 MessageText，并在正常结束或异常的 finally 中恢复原文。真实离线 HTTP 验证已覆盖 onboarding.view 之后进入 fishing.query。
- displayCommandText 专用于可执行文字提示；commandText 保留按钮源数据语义。分解确认/取消提示和客服系统文字已切换显示函数，format.enabled 关闭时文字仍显示实际输入前缀。
- 统一 assertCommandBudget 校验普通与 MD 指令按钮，覆盖嵌套、显式原样指令及目标应用策略。消息编辑接入同一前缀准备与预算校验；主动通知在调用 MessageDirect 前检查预算，不截断、不修改原始节点。
- 新增 command-policy-boundaries 测试文件，相关联合测试 97 项通过；通知投递、教学和客服附加回归 24 项通过（与联合集合有重叠，不累加为独立总数）。tsgo、Lint、测试类型、构建与 diff 检查通过。未重跑此前全量失败集合，未进行真实平台投递。
