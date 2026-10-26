import type { RobotBusinessResult } from '../api/bot/robot-business';
import type { Events } from 'alemonjs';

// 游戏路由仅接收消息和交互，不包含登录、连接等平台生命周期事件。
export type GameEvent = Events['message.create' | 'private.message.create' | 'interaction.create' | 'private.interaction.create'] & {
  __res?: RobotBusinessResult;
};
