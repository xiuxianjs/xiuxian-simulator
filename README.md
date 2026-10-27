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

### AI 插件只读能力（Expose）

机器人提供协议 `xiuxian.player.v1`，provider 为实际加载名（通常是 `xiuxian-game`）。当前动作 `get_attributes` 返回当前消息玩家的 UID、道号、境界名称、五维属性及上限、战斗属性。数值与单位沿用服务端属性面板；不会调用主页结算或发送聊天消息。

默认开启，无需配置即可由框架识别的插件在当前 QQ 消息中调用。在 `xiuxian-game` 下可关闭或限制调用方：

```yaml
expose:
  enabled: true # false 关闭全部 Expose 调用
  # 可选；不配置允许框架识别的插件，空数组拒绝全部调用
  # allowed_callers: ['你的AI插件实际加载名']
```

可信 AI 插件在自己的 QQ 消息处理器中调用，参数只能为 `{}`：

```ts
import { Expose } from 'alemonjs';

const result = await Expose.create().call('xiuxian.player.v1', 'xiuxian-game', 'get_attributes', {}, { timeoutMs: 10000 });
if (result.ok) {
  // 将 result.data 作为工具结果；不要假设其他动作具有相同输出。
} else {
  // 按 result.error.code 处理拒绝、取消、后端失败等情况。
}
```

调用者须由框架识别，模型不能指定调用方或目标 UID。只允许当前 QQ 消息事件，不支持定时后台代玩或按钮事件；本包 `events` 开关和渠道机器人身份校验同样生效。每次查询重新向服务端解析当前绑定角色，不使用事件附加的 UID；服务端继续校验接口归属。参数与输出均由 Expose 契约校验。身份与属性 HTTP 请求接收取消信号。

默认信任宿主加载的插件，也可使用白名单收紧调用范围；调用插件应在玩家明确要求时调用，不应把私人属性转发到其他会话。同进程插件不是沙箱，此机制也不提供玩家长期委托授权。当前未开放战斗、领取、消耗等写操作；未来须接入服务端确认引用、原操作编号与幂等结算，不能直接把任意聊天指令作为工具执行。
