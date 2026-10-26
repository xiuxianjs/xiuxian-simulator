# 修仙机器人

本项目是基于 AlemonJS 的修仙文字消息游戏机器人。机器人接收聊天平台指令，处理交互与气泡排版，并通过 HTTP API 向 游戏服务查询和提交操作；游戏规则、状态变更与结算以服务端为准。

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
