---
name: feature-dev
description: 在 xiuxian-game 开发或排查跨机器人、Go API、任务调度、图片上传的业务链路时使用；核对真实接口、运行配置与验证命令。
---

# 修仙机器人业务开发

1. 先读项目 `AGENTS.md`、`package.json`、目标附近的 `src` 实现。只在任务涉及的链路上继续追踪，不按旧文档猜测接口或配置。
2. 游戏规则、结算和持久化以相邻的 `xiuxian-game-server` 当前源码及数据库迁移为准；机器人负责指令、接口调用、展示和平台投递。改接口时核对服务端路由、OpenAPI、客户端路径和鉴权；内部接口使用当前约定的 `/api/v1/internal/...`，API 基础地址只填 origin。
3. 追踪完整运行依赖：机器人通过 AlemonJS `getConfig().value` 读取 `alemon.config.yaml` 的 `xiuxian-game.backend`，不得改回读取 `XIUXIAN_*` 环境变量；Go 服务仍使用其环境变量配置，须核对两侧 Worker 开关一致，外部服务与数据库表是否已就绪。图片上传要核对 `src/utils/appConfig.ts`、`src/utils/minio.ts` 的 `minio` 字段及存储服务可用性；不得把密钥写入示例、日志或提交。缺配置时应给出明确错误或已有的降级结果，不让解构异常代替诊断。
4. 若涉及新指令或气泡展示，按 `AGENTS.md` 展示拟定气泡并取得二次确认；修改路由时检查匹配顺序和已有交互。奖励、领取及重复写入要核对服务端事务与幂等键。
5. 代码修改后先执行 `tsgo`，再执行 `yarn lint:fix`；按改动范围补充有意义的验证。Go 侧接口或文档变更执行仓库现有的相关测试与 `make docs-check`。先检查 `package.json` 再引用其他脚本，不能声称不存在的门禁已执行。

更具体的现有链路示例见 [feature-dev 参考](../../../.github/skills/feature-dev/content.md)；如示例与当前源码冲突，以当前源码为准。
