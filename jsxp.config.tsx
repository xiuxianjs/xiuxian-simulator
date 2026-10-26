import { defineConfig } from 'jsxp';
import AttributePanel from '@src/img/views/AttributePanel';
import PayQrCode from '@src/img/views/PayQrCode';
import PrivilegesPanel from '@src/img/views/PrivilegesPanel';
import RightsPanel from '@src/img/views/RightsPanel';
import * as React from 'react';

const mockPanelData = {
  daoName: '小玉',
  uid: 1000002,
  realmName: '金丹初期',
  maxAttributeBonus: 3,
  strength: 148,
  maxStrength: 535,
  intelligence: 169,
  maxIntelligence: 535,
  constitution: 157,
  maxConstitution: 535,
  agility: 118,
  maxAgility: 535,
  luck: 56,
  maxLuck: 535,
  combatPower: 1255,
  physicalAttack: 1616,
  physicalDefense: 844,
  magicAttack: 1679,
  magicDefense: 881,
  spiritualPower: 920,
  mentalPower: 100,
  hp: 5630,
  speed: 177,
  critRate: 20,
  critDamage: 164,
  antiCritRate: 0,
  hitRate: 0,
  dodgeRate: 0
};

const mockRightsData = {
  avatarURL: 'https://q1.qlogo.cn/g?b=qq&nk=10000&s=640',
  name: '太初仙帝',
  progressText: '已达最高VIP等级',
  vipLevel: 10,
  totalRechargeAmount: 8888,
  firstRechargeTimeText: '2025-10-01',
  monthCardValid: true,
  monthCardExpireText: '2026-06-30 23:59',
  monthCardRemainingDays: 78,
  monthCardTotalDays: 287,
  monthCardMaxDays: 365,
  monthCardRemainingQuota: 78,
  monthCardInstantRewards: ['道晶×680', '灵晶×2888', '仙品引灵符×3', '天阶功法残卷×1'],
  monthCardDailyClaimable: 3,
  monthCardDailyClaimed: 75,
  monthCardDailyUpcoming: 78,
  seclusionPassValid: true,
  seclusionPassExpireText: '2026-05-18 23:59',
  seclusionPassRemainingDays: 35,
  seclusionPriceText: '98.00元/月',
  seclusionRewards: ['道晶×1280', '灵晶×3888', '九转凝神丹×5', '闭关悟道令×1']
};

const mockPayQrCodeData = {
  data: {
    qrCodeDataUrl:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
          <rect width="240" height="240" fill="#ffffff"/>
          <rect x="16" y="16" width="56" height="56" fill="#111111"/>
          <rect x="28" y="28" width="32" height="32" fill="#ffffff"/>
          <rect x="168" y="16" width="56" height="56" fill="#111111"/>
          <rect x="180" y="28" width="32" height="32" fill="#ffffff"/>
          <rect x="16" y="168" width="56" height="56" fill="#111111"/>
          <rect x="28" y="180" width="32" height="32" fill="#ffffff"/>
          <rect x="96" y="24" width="12" height="12" fill="#111111"/>
          <rect x="120" y="24" width="12" height="12" fill="#111111"/>
          <rect x="108" y="36" width="12" height="12" fill="#111111"/>
          <rect x="84" y="60" width="12" height="12" fill="#111111"/>
          <rect x="96" y="72" width="12" height="12" fill="#111111"/>
          <rect x="120" y="72" width="12" height="12" fill="#111111"/>
          <rect x="144" y="60" width="12" height="12" fill="#111111"/>
          <rect x="84" y="96" width="12" height="12" fill="#111111"/>
          <rect x="108" y="96" width="12" height="12" fill="#111111"/>
          <rect x="132" y="96" width="12" height="12" fill="#111111"/>
          <rect x="156" y="96" width="12" height="12" fill="#111111"/>
          <rect x="72" y="120" width="12" height="12" fill="#111111"/>
          <rect x="96" y="120" width="12" height="12" fill="#111111"/>
          <rect x="120" y="120" width="12" height="12" fill="#111111"/>
          <rect x="144" y="120" width="12" height="12" fill="#111111"/>
          <rect x="168" y="120" width="12" height="12" fill="#111111"/>
          <rect x="84" y="144" width="12" height="12" fill="#111111"/>
          <rect x="108" y="144" width="12" height="12" fill="#111111"/>
          <rect x="132" y="144" width="12" height="12" fill="#111111"/>
          <rect x="156" y="144" width="12" height="12" fill="#111111"/>
          <rect x="96" y="168" width="12" height="12" fill="#111111"/>
          <rect x="120" y="168" width="12" height="12" fill="#111111"/>
          <rect x="144" y="168" width="12" height="12" fill="#111111"/>
          <rect x="168" y="180" width="12" height="12" fill="#111111"/>
          <rect x="192" y="180" width="12" height="12" fill="#111111"/>
          <rect x="96" y="192" width="12" height="12" fill="#111111"/>
          <rect x="120" y="192" width="12" height="12" fill="#111111"/>
          <rect x="144" y="204" width="12" height="12" fill="#111111"/>
        </svg>
      `),
    packageName: '月卡礼包',
    yuan: '30.00',
    orderNo: 'ORDER-20260421-0001'
  }
};

export default defineConfig({
  routes: {
    '/attribute-panel': {
      component: <AttributePanel data={mockPanelData} />
    },
    '/rights-panel': {
      component: <RightsPanel data={mockRightsData} />
    },
    '/pay-qrcode': {
      component: <PayQrCode data={mockPayQrCodeData.data} />
    },
    '/privileges-panel': {
      component: (
        <PrivilegesPanel
          data={{
            avatarURL: 'https://q1.qlogo.cn/g?b=qq&nk=10000&s=640',
            name: '太初仙帝',
            vipLevel: 5,
            totalRechargeAmount: 3000,
            theme: { backgrounds: ['https://oss-files.alemonjs.com/images-proxy/mis/files/2026/04/21/1776761441496853369.png'] },
            hasMonthCard: true,
            vipPrivileges: [
              { text: '万宝楼精力丹/元力丹每日8份（每级+1份）', unlocked: true },
              { text: 'V1+ 签到币双倍（每月1、15号）', unlocked: true },
              { text: 'V3+ 签到币双倍（每月8、22号）', unlocked: true },
              { text: 'V5+ 签到币双倍（每月5、10、20、25号）', unlocked: true },
              { text: 'V3+ 神奇商店九五折', unlocked: true },
              { text: 'V5+ 神奇商店九折', unlocked: true },
              { text: 'V8+ 神奇商店八五折', unlocked: false, needText: '（还需5000元）' },
              { text: 'V10+ 神奇商店八折', unlocked: false, needText: '（还需7000元）' }
            ],
            monthCardPrivileges: [
              { text: '经验加成 +10%', unlocked: true },
              { text: '商店「元力丹」「精力丹」额度 +2', unlocked: true }
            ]
          }}
        />
      )
    }
  }
});
