import type { HomeOverviewData } from '@src/api/schemas/player-overview';
import type { HomeNotificationItem } from '@src/api/schemas/home-notification-query';
import type { CodeResult } from '@src/types/result';
import { logger } from 'alemonjs';

export type MeHomeResource = {
  current: number;
  cap: number;
  recoverText: string;
};

export type MeHomeData = {
  bannerImageUrl?: string;
  guildName?: string | null;
  notifications: HomeNotificationItem[];
  /** 上次签到距今天数，未签到过则为 null，< 7 则不触发归来信 */
  absenceDays: number | null;
  atmosphere: { text: string | null; kind: 'absence' | 'ambience' | 'none' };
  profile: {
    uid: number;
    name: string;
    hasMonthCard: boolean;
    title: string;
    genderText: string;
    nextGenderText: string;
    signature: string;
  };
  stats: {
    combatPower: number;
    realmName: string;
    spiritRootTitle: string;
    experienceText: string;
    qi: MeHomeResource;
    mental: MeHomeResource;
  };
  actions: {
    socialTargetUid: number;
    renameValue: string;
    canStoreGreenBottle: boolean;
    isNewcomer: boolean;
    isEarlyStarter: boolean;
    canAcceptApprentice: boolean;
    canJoinMasterAsDisciple: boolean;
    canUseSecondLayerFeature: boolean;
    canUseFifthLayerFeature: boolean;
    canUseSpar: boolean;
    canJoinAlchemyGuide: boolean;
    canUseMeridian: boolean;
    canUseProfessionAndCave: boolean;
    canUseSoulArtifact: boolean;
    canUseSoulPath: boolean;
    canAdvanceSoulArtifact: boolean;
    canUseRobberyLikePvp: boolean;
  };
};

export type MeHomeResult = CodeResult<'OK', 'USER_NOT_FOUND' | 'LOAD_FAILED', MeHomeData>;

const parseBanner = (raw: string | null): string | undefined => {
  if (!raw) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    return parsed && typeof parsed === 'object' && 'banner' in parsed && typeof parsed.banner === 'string' ? parsed.banner : undefined;
  } catch {
    return undefined;
  }
};

export default function App(overview: HomeOverviewData): MeHomeResult {
  try {
    const facts = overview.profile;
    const user = facts.user;

    if (!facts.found || !user || !facts.homeView) {
      return { code: 'USER_NOT_FOUND' };
    }

    const signature = typeof user.signature === 'string' ? user.signature.trim() : '';
    const profileName = typeof user.name === 'string' && user.name.length > 0 ? user.name : '未命名';
    const renameValue = typeof user.name === 'string' ? user.name : '';
    const bannerImageUrl = parseBanner(facts.title?.theme ?? null);

    // ── 通知区域 ────────────────────────
    // 通知徽标由服务端以玩家身份聚合；客户端仅映射原按钮和文案。
    const notifications = overview.notifications;

    const access = facts.access;

    return {
      code: 'OK',
      data: {
        bannerImageUrl,
        guildName: overview.guildName,
        notifications,
        absenceDays: facts.absenceDays,
        atmosphere: overview.atmosphere!,
        profile: {
          uid: user.id,
          name: profileName,
          hasMonthCard: facts.homeView.hasMonthCard === true,
          title: facts.title?.name ?? '无',
          genderText: user.gender === 1 ? '男' : '女',
          nextGenderText: user.gender === 1 ? '女' : '男',
          signature
        },
        stats: {
          combatPower: facts.combatPower,
          realmName: facts.homeView.realmName,
          spiritRootTitle: facts.homeView.spiritRootTitle ?? '暂无',
          experienceText: facts.homeView.experienceText,
          qi: {
            current: facts.qi.current,
            cap: facts.qi.cap,
            recoverText: facts.homeView.qiRecoverText
          },
          mental: {
            current: facts.mental.current,
            cap: facts.mental.cap,
            recoverText: facts.homeView.mentalRecoverText
          }
        },
        actions: {
          socialTargetUid: user.id,
          renameValue,
          canStoreGreenBottle: facts.canStoreGreenBottle,
          isNewcomer: facts.isNewcomer,
          isEarlyStarter: facts.homeView.isEarlyStarter,
          canAcceptApprentice: access.canAcceptDisciple,
          canJoinMasterAsDisciple: access.canJoinMasterAsDisciple,
          canUseSecondLayerFeature: access.canUseSecondLayerFeature,
          canUseFifthLayerFeature: access.canUseFifthLayerFeature,
          canUseSpar: access.canUseSpar,
          canJoinAlchemyGuide: access.canJoinAlchemyGuide,
          canUseMeridian: access.canUseMeridian,
          canUseProfessionAndCave: access.canUseProfessionAndCave,
          canUseSoulArtifact: access.canUseSoulArtifact,
          canUseSoulPath: access.canUseSoulPath,
          canAdvanceSoulArtifact: access.canAdvanceSoulArtifact,
          canUseRobberyLikePvp: access.canUseRobberyLikePvp
        }
      }
    };
  } catch (error) {
    logger.error(error);

    return { code: 'LOAD_FAILED' };
  }
}
