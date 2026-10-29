import { parseBackendFriendSettings } from '../api/bot/friend-settings';
import { parseBackendRandomFriend } from '../api/bot/random-friend-queries';
import { parseBackendFriendWorkflow } from '../api/bot/social-workflows';
import { parseBackendFriendMutation } from '../api/bot/friend-request-actions';
import { parseBackendFriendReject } from '../api/bot/friend-request-reject';
import { parseBackendBlockUser } from '../api/bot/block-user-by-name';
import { parseBackendUnblock } from '../api/bot/blocklist-removal';
import { parseBackendBlocklist, parseBackendFriendRequests, parseBackendFriends } from '../api/bot/queries';
import { parseGuardedSocialQuery } from '../api/bot/social-robot-query';
import { mutation, observation } from './mutation';
import { boolean, fields, integer, list, object, page, text } from './schema';

const access = object({ ok: boolean, realmName: text, canUseSpar: boolean });

export const friendActions = {
  get_friend_blocklist: observation(
    '查询本人黑名单记录；取消拉黑使用此列表的记录 ID。服务端保留准入检查和实际读取结果。',
    'friends.blocklist',
    object({}),
    object({ access, data: list(object({ id: integer, blockedUserName: text, createdAt: text })) }, ['data']),
    () => '/黑名单',
    data => {
      const result = parseGuardedSocialQuery(data, parseBackendBlocklist);

      return { ...result, data: result.data?.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })) };
    }
  ),
  block_friend_by_name: mutation<{ targetName: string }>(
    '按精确道号拉黑目标，阻止其发送好友申请；服务端还会尝试移除现有好友关系，该后续移除可能失败。',
    'friends.block',
    object({ targetName: { type: 'string', minLength: 1, maxLength: 100 } }),
    object({ access, data: object({ outcome: text, name: text, realmName: text }, ['name', 'realmName']) }, ['data']),
    input => `/拉黑 ${input.targetName}`,
    data => parseGuardedSocialQuery(data, parseBackendBlockUser)
  ),
  unblock_friend: mutation<{ recordId: number }>(
    '按本人黑名单中的记录 ID 取消拉黑；服务端校验记录归属。取消拉黑不会自动恢复好友关系。',
    'friends.unblock',
    object({ recordId: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } }),
    object({ access, data: object({ outcome: text, blockedUserId: integer, name: text, realmName: text }, ['blockedUserId', 'name', 'realmName']) }, ['data']),
    input => `/取消拉黑 ${input.recordId}`,
    data => parseGuardedSocialQuery(data, parseBackendUnblock),
    input => ({ recordId: String(input.recordId) })
  ),
  find_random_friend: observation(
    '查询服务端推荐的一位道友；player 缺失表示没有推荐目标，access.ok=false 表示资格未解锁。',
    'friends.random',
    object({}),
    object(
      {
        access: object({ ok: boolean, realmName: text }, ['realmName']),
        player: object({ uid: integer, name: text, realmName: text, activeTitle: text }, ['realmName', 'activeTitle'])
      },
      ['player']
    ),
    () => '/随机好友',
    parseBackendRandomFriend
  ),
  get_friend_request_settings: observation(
    '查询本人是否接受好友申请及功能资格。',
    'friends.settings',
    object({}),
    object({ canUseFifthLayerFeature: boolean, realmName: text, isEnabled: boolean }, ['realmName']),
    () => '/好友设置',
    parseBackendFriendSettings
  ),
  set_friend_requests_enabled: mutation<{ enabled: boolean }>(
    '开启或关闭本人接收好友申请；资格未解锁时以服务端状态为准，不报告设置成功。',
    'friends.settings-update',
    object({ enabled: boolean }),
    object({ canUseFifthLayerFeature: boolean, realmName: text, isEnabled: boolean }, ['realmName']),
    input => `/好友设置 ${input.enabled ? '开启' : '关闭'}`,
    (data, input) => {
      const result = parseBackendFriendSettings(data);

      if (result.canUseFifthLayerFeature && result.isEnabled !== input.enabled) {
        throw new Error('好友申请设置回执不匹配');
      }

      return result;
    }
  ),
  request_friend: mutation<{ targetUid: number }>(
    '向指定目标玩家发起好友申请；targetUid 是目标而非调用者，服务端校验资格、关系和申请设置。',
    'friends.request',
    object({ targetUid: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } }),
    object(
      {
        outcome: text,
        realmName: text,
        targetId: text,
        target: object({ id: integer, name: text }, ['name']),
        request: object({ success: boolean, requestId: integer, ...fields(text, 'targetName fromUserName message') })
      },
      ['realmName', 'target', 'request']
    ),
    input => `/结交好友 ${input.targetUid}`,
    data => parseBackendFriendWorkflow(data, 'request'),
    input => ({ targetUid: String(input.targetUid) })
  ),
  accept_friend_request: mutation<{ requestId: number }>(
    '接受本人收到的指定好友申请；服务端校验申请归属和有效状态。',
    'friends.accept',
    object({ requestId: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } }),
    object({ access, data: object({ success: boolean, requestId: integer, ...fields(text, 'targetName fromUserName message') }) }, ['data']),
    input => `/同意结交 ${input.requestId}`,
    (data, input) => parseGuardedSocialQuery(data, value => {
        const result = parseBackendFriendMutation(value);

        if (result.requestId !== input.requestId || !result.success) {
          throw new Error('好友申请接受回执不匹配');
        }

        return result;
      }),
    input => ({ requestId: String(input.requestId) })
  ),
  reject_friend_request: mutation<{ requestId: number }>(
    '拒绝本人收到的指定好友申请；服务端校验申请归属和有效状态。',
    'friends.reject',
    object({ requestId: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } }),
    object({ access, data: object({ outcome: text, listed: boolean, fromUserName: text, realmName: text }, ['fromUserName', 'realmName']) }, ['data']),
    input => `/拒绝结交 ${input.requestId}`,
    data => parseGuardedSocialQuery(data, parseBackendFriendReject),
    input => ({ requestId: String(input.requestId) })
  ),
  get_friends: observation<{ page?: number }>(
    '分页查询本人好友、关系及亲密度；好友编号可作为赠礼目标。未解锁时 access.ok=false，不将缺失列表当作空列表。',
    'friends.overview',
    object({ page }, ['page']),
    object(
      {
        access,
        data: object({
          ...fields(integer, 'total currentPage pageSize maxFriends myGender'),
          hasCompanion: boolean,
          list: list(
            object(
              {
                ...fields(integer, 'friendId relationType intimacy gender'),
                ...fields(text, 'friendName relationText spiritBondLevel'),
                ...fields(boolean, 'canProposeCompanion hasCompanion')
              },
              ['gender']
            )
          )
        })
      },
      ['data']
    ),
    input => `/我的好友 ${input.page ?? 1}`,
    data => parseGuardedSocialQuery(data, parseBackendFriends),
    input => ({ page: input.page ?? 1, pageSize: 5 })
  ),
  get_friend_requests: observation(
    '查询本人收到的待处理好友申请；未解锁时 access.ok=false。',
    'friends.requests',
    object({}),
    object(
      { access, data: list(object({ ...fields(integer, 'id fromUserId'), ...fields(text, 'fromUserName fromUserRealm message createdAt') }, ['message'])) },
      ['data']
    ),
    () => '/好友申请',
    data => {
      const result = parseGuardedSocialQuery(data, parseBackendFriendRequests);

      return { ...result, data: result.data?.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })) };
    }
  )
};
