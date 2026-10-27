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
