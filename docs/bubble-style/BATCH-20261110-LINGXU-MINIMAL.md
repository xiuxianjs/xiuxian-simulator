# 灵墟洞天最简 MVP 气泡批次

依据独立最简设计新增七类 QQ 页面，复用 `presentation.section` 与原 `FormatGui`。不引用已作废旧洞天实装，未修改原完整设计稿。

状态以生命点展示；保护按钮归属实际物件；扩容从行囊进入；入场/制盘/扩容都由服务端原预览引用确认。行动记录为对象行加时间，经历与收获分别引用。原五格底栏保留，所有蓝链填入不直发，分页只用 `nav`。

对照产物在仓库外：`D:/data/alemone/bubble-style-mockups/lingxu-minimal-qq-20261110/comparison.png`，同目录保存 HTML、脚本和实际 `createTestApp` 发送节点 JSON。改前为最新 main 的原职业页；改后为本次真实处理器的七类页。数据为离线接口夹具，不是 QQ 实机截图。

验证：框架范围 `tsgo --noEmit -p test/framework/tsconfig.json`、`yarn lint:fix` 通过；20项定向真实框架测试通过。整体 `tsgo --noEmit` 已运行，受既有 `test/helpers/agent-play-message.ts` 的外部相邻 `alemonjs-agent-link` 构建产物缺失影响，不能报告整体通过。当前 Node22 的通用资产 loader 返回 `source undefined`，用已存在 Node24.22.1 运行同一 loader 和测试；导入模块存在既有常驻句柄，定向命令附 `--test-force-exit`。未改公共 runner 或原测试规避问题。

相关 `cave-home` 回归21项通过，6个既有活动用例期待一次 RPC，而当前在线奇遇另发一次 RPC，出现 `2 !== 1`；临时移除本次新增菜单行后单跑仍复现。未修改该奇遇逻辑或放宽既有断言。

后端原子结算、Redis 确认引用与实际规则由配套服务端提供；页面通过不代表已部署或产出周期已经平衡。
