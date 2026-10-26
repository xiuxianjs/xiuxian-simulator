import type { ThemeConfig } from '@src/types/theme';
import classNames from 'classnames';
import * as React from 'react';
import { buildTokens, PanelFailure, PanelShell, SectionTitle, ThemeContext } from './_panelShared';

export interface RightsPanelData {
  avatarURL?: string;
  name: string;
  progressText: string;
  vipLevel: number;
  totalRechargeAmount: number;
  firstRechargeTimeText: string;
  monthCardValid: boolean;
  monthCardExpireText: string;
  monthCardRemainingDays: number;
  monthCardTotalDays: number;
  monthCardMaxDays: number;
  monthCardRemainingQuota: number;
  monthCardInstantRewards: string[];
  monthCardDailyClaimable: number;
  monthCardDailyClaimed: number;
  monthCardDailyUpcoming: number;
  seclusionPassValid: boolean;
  seclusionPassExpireText: string;
  seclusionPassRemainingDays: number;
  seclusionPriceText: string;
  seclusionRewards: string[];
  theme?: ThemeConfig | null;
}

interface Props {
  data?: RightsPanelData;
}

function StatusPill({ text, active }: { text: string; active: boolean }) {
  const T = React.useContext(ThemeContext);

  return (
    <span
      className={classNames('rounded-full px-[10px] py-[3px] text-[12px] font-bold tracking-[1px]')}
      style={{
        color: active ? '#fff' : T.inkLight,
        background: active ? `linear-gradient(135deg, ${T.cinnabar} 0%, rgba(180,80,40,0.78) 100%)` : 'rgba(255,248,235,0.28)',
        border: `1px solid ${active ? T.cinnabarBorder : T.border}`
      }}
    >
      {text}
    </span>
  );
}

function SectionCard({ title, extra, children }: { title: string; extra?: string; children: React.ReactNode }) {
  const T = React.useContext(ThemeContext);

  return (
    <div
      className={classNames('relative z-[1] overflow-hidden')}
      style={{
        margin: '10px 12px 0',
        border: `1px solid ${T.border}`,
        borderRadius: '10px 4px 12px 5px',
        background: T.card,
        boxShadow: 'inset 0 1px 0 rgba(255,245,225,0.6), 0 2px 8px rgba(80,55,30,0.10)'
      }}
    >
      <SectionTitle title={title} extra={extra} />
      <div>{children}</div>
    </div>
  );
}

function HeroHeader({ data }: { data: RightsPanelData }) {
  const T = React.useContext(ThemeContext);

  return (
    <div
      className={classNames('relative z-[1] flex items-center gap-[14px] px-4 pb-[14px] pt-4')}
      style={{
        borderBottom: `2px solid ${T.borderMid}`,
        background: T.headerBg
      }}
    >
      {data.avatarURL ? (
        <div
          className={classNames('h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full')}
          style={{
            border: `3px solid ${T.borderMid}`,
            background: '#d0c0a0'
          }}
        >
          <img className={classNames('h-full w-full object-cover')} src={data.avatarURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ) : (
        <div
          className={classNames('flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full')}
          style={{
            border: `3px solid ${T.borderMid}`,
            background: 'rgba(200,185,155,0.70)'
          }}
        >
          <span className={classNames('text-[30px] font-bold')} style={{ color: T.cinnabar }}>
            {data.name.charAt(0)}
          </span>
        </div>
      )}
      <div className={classNames('flex flex-1 flex-col gap-[5px]')}>
        <span className={classNames('text-[24px] font-bold tracking-[1px]')} style={{ color: T.inkDark }}>
          {data.name}
        </span>
        <div className={classNames('flex flex-wrap items-center gap-2')}>
          <span
            className={classNames('rounded-[4px] px-[10px] py-[3px] text-[14px] font-bold tracking-[1px] text-white')}
            style={{
              background: `linear-gradient(135deg, ${T.cinnabar} 0%, rgba(180,80,40,0.82) 100%)`,
              boxShadow: '0 4px 10px rgba(120,40,10,0.16)'
            }}
          >
            VIP {data.vipLevel}
          </span>
          <StatusPill text={data.monthCardValid ? '月卡生效中' : '月卡未开通'} active={data.monthCardValid} />
          <StatusPill text={data.seclusionPassValid ? '金手指生效中' : '金手指未开通'} active={data.seclusionPassValid} />
        </div>
        <span className={classNames('text-[13px] leading-[1.6]')} style={{ color: T.inkLight }}>
          {data.firstRechargeTimeText}
        </span>
      </div>
    </div>
  );
}

function OverviewStat({ label, value, accent }: { label: string; value: string; accent?: 'warm' | 'cool' }) {
  const T = React.useContext(ThemeContext);
  const isWarm = accent !== 'cool';

  return (
    <div
      className={classNames('flex min-h-[74px] flex-1 flex-col justify-between rounded-[12px_5px_12px_6px] px-3 py-[10px]')}
      style={{
        background: isWarm ? 'rgba(255,247,234,0.38)' : 'rgba(219,231,236,0.18)',
        border: `1px solid ${isWarm ? T.border : T.borderCool}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.40)'
      }}
    >
      <span className={classNames('text-[12px] tracking-[1px]')} style={{ color: T.inkLight }}>
        {label}
      </span>
      <span className={classNames('text-[20px] font-bold leading-[1.2]')} style={{ color: isWarm ? T.cinnabar : T.janglan }}>
        {value}
      </span>
    </div>
  );
}

function OverviewBlock({ data }: { data: RightsPanelData }) {
  const T = React.useContext(ThemeContext);

  return (
    <div
      className={classNames('relative z-[1] overflow-hidden')}
      style={{
        margin: '10px 12px 0',
        border: `1px solid ${T.border}`,
        borderRadius: '12px 5px 14px 6px',
        background: T.card,
        boxShadow: 'inset 0 1px 0 rgba(255,245,225,0.6), 0 2px 8px rgba(80,55,30,0.10)'
      }}
    >
      <div className={classNames('grid grid-cols-2 gap-[10px] px-4 py-4')}>
        <OverviewStat label='累计充值' value={`${data.totalRechargeAmount.toFixed(0)} 元`} />
        <OverviewStat label='权益进度' value={`VIP ${data.vipLevel}`} accent='cool' />
        <OverviewStat label='月卡剩余' value={data.monthCardValid ? `${data.monthCardRemainingDays} 天` : '未开通'} />
        <OverviewStat label='金手指剩余' value={data.seclusionPassValid ? `${data.seclusionPassRemainingDays} 天` : '未开通'} accent='cool' />
      </div>
      <div
        className={classNames('mx-4 mb-4 rounded-[12px_5px_10px_6px] px-3 py-[10px] text-[14px] leading-[1.65]')}
        style={{
          background: 'rgba(255,248,235,0.26)',
          border: `1px solid ${T.border}`,
          color: T.inkMid
        }}
      >
        {data.progressText}
      </div>
    </div>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const T = React.useContext(ThemeContext);

  return (
    <div
      className={classNames('flex justify-between gap-3 px-4 py-[5px]')}
      style={{
        borderTop: `1px solid ${T.divider}`
      }}
    >
      <span className={classNames('text-[14px]')} style={{ color: T.inkLight }}>
        {label}
      </span>
      <span className={classNames('text-right text-[14px] font-bold')} style={{ color: valueColor ?? T.inkDark }}>
        {value}
      </span>
    </div>
  );
}

function BenefitSummaryCard({ title, accent, status, detail }: { title: string; accent: string; status: string; detail: string }) {
  const T = React.useContext(ThemeContext);

  return (
    <div
      className={classNames('flex flex-1 flex-col gap-[8px] rounded-[12px_5px_12px_6px] px-3 py-3')}
      style={{
        background: 'rgba(255,248,235,0.24)',
        border: `1px solid ${T.border}`
      }}
    >
      <div className={classNames('flex items-center gap-2')}>
        <span className={classNames('h-[10px] w-[10px] rounded-full')} style={{ background: accent, boxShadow: `0 0 0 3px ${T.cinnabarBg}` }} />
        <span className={classNames('text-[15px] font-bold')} style={{ color: T.inkDark }}>
          {title}
        </span>
      </div>
      <span className={classNames('text-[18px] font-bold leading-[1.25]')} style={{ color: accent }}>
        {status}
      </span>
      <span className={classNames('text-[13px] leading-[1.55]')} style={{ color: T.inkLight }}>
        {detail}
      </span>
    </div>
  );
}

function RewardBlock({ title, rewards, emptyText }: { title: string; rewards: string[]; emptyText: string }) {
  const T = React.useContext(ThemeContext);

  return (
    <div className={classNames('px-4 pb-2 pt-[5px]')}>
      <div className={classNames('mb-[6px] text-[16px]')} style={{ color: T.amber }}>
        {title}
      </div>
      {rewards.length > 0 ? (
        <div className={classNames('flex flex-wrap gap-[8px]')}>
          {rewards.map((reward, index) => (
            <div
              key={`${title}-${reward}-${index}`}
              className={classNames('rounded-[999px] px-3 py-[7px] text-[14px] leading-[1.3]')}
              style={{
                color: T.inkDark,
                background: 'rgba(255,248,235,0.30)',
                border: `1px solid ${T.border}`
              }}
            >
              {reward}
            </div>
          ))}
        </div>
      ) : (
        <div
          className={classNames('rounded-[12px_5px_10px_6px] px-3 py-[10px] text-[15px] leading-[1.6]')}
          style={{
            color: T.inkLight,
            background: 'rgba(255,248,235,0.25)',
            border: `1px solid ${T.border}`
          }}
        >
          {emptyText}
        </div>
      )}
    </div>
  );
}

function BenefitsOverview({ data }: { data: RightsPanelData }) {
  const T = React.useContext(ThemeContext);

  return (
    <SectionCard title='权益总览' extra='身份 / 增益 / 时效'>
      <div className={classNames('flex gap-[10px] px-4 py-4')}>
        <BenefitSummaryCard title='VIP身份' accent={T.cinnabar} status={`VIP ${data.vipLevel}`} detail='累计充值决定当前 VIP 等级与对应身份权益。' />
        <BenefitSummaryCard
          title='月卡权益'
          accent={data.monthCardValid ? T.amber : T.inkLight}
          status={data.monthCardValid ? `${data.monthCardRemainingDays} 天` : '待开通'}
          detail={data.monthCardValid ? `今日可领 ${data.monthCardDailyClaimable} 天奖励` : '开通后可立即获得奖励，并解锁每日领取。'}
        />
        <BenefitSummaryCard
          title='金手指'
          accent={data.seclusionPassValid ? T.janglan : T.inkLight}
          status={data.seclusionPassValid ? `${data.seclusionPassRemainingDays} 天` : '待开通'}
          detail='修为更快积累，主线与秘境更多收获。'
        />
      </div>
    </SectionCard>
  );
}

function HintBlock({ text }: { text: string }) {
  const T = React.useContext(ThemeContext);

  return (
    <div
      className={classNames('mx-4 my-[8px] rounded-[10px_4px_10px_5px] px-3 py-[9px] text-[13px] leading-[1.65]')}
      style={{
        color: T.inkLight,
        background: 'rgba(82,111,122,0.08)',
        border: `1px dashed ${T.borderCool}`
      }}
    >
      {text}
    </div>
  );
}

function DailyClaimStrip({ data }: { data: RightsPanelData }) {
  return (
    <div className={classNames('grid grid-cols-3 gap-[8px] px-4 pb-2 pt-[6px]')}>
      <OverviewStat label='今日可领' value={`${data.monthCardDailyClaimable} 天`} />
      <OverviewStat label='已领' value={`${data.monthCardDailyClaimed}`} accent='cool' />
      <OverviewStat label='未到期' value={`${data.monthCardDailyUpcoming}`} />
    </div>
  );
}

function DescriptionBlock({ text }: { text: string }) {
  const T = React.useContext(ThemeContext);

  return (
    <div className={classNames('px-4 pb-1 pt-[5px] text-[14px] leading-[1.7]')} style={{ color: T.inkDark }}>
      {text}
    </div>
  );
}

export default function RightsPanel({ data }: Props) {
  if (!data) {
    return <PanelFailure message='权益数据加载失败' />;
  }

  const T = buildTokens(data.theme);

  return (
    <PanelShell theme={data.theme}>
      <HeroHeader data={data} />
      <OverviewBlock data={data} />
      <BenefitsOverview data={data} />

      <SectionCard title='月卡' extra={data.monthCardValid ? '已开通' : '未开通或已过期'}>
        <InfoRow label='到期时间' value={data.monthCardExpireText} valueColor={T.janglan} />
        <InfoRow label='剩余天数' value={`${data.monthCardRemainingDays} 天`} />
        <InfoRow label='历史累计开卡' value={`${data.monthCardTotalDays} 天`} />
        <InfoRow label='距续购上限' value={`${data.monthCardRemainingQuota} 天`} valueColor={T.amber} />
        <HintBlock text={`当前剩余达到${data.monthCardMaxDays}天时暂停续购，减少后可续购；历史累计开卡天数不计入此上限。`} />
        <DescriptionBlock text='月卡新增权益：连锁任务上限提升为10个，每个任务最多10个行为。' />
        {data.monthCardValid ? (
          <>
            <DailyClaimStrip data={data} />
            <HintBlock text='每日奖励会随着有效期逐日发放，记得及时领取，避免错过当日进度。' />
          </>
        ) : null}
        {!data.monthCardValid ? <RewardBlock title='开卡即时奖励' rewards={data.monthCardInstantRewards} emptyText='以当前月卡配置为准' /> : null}
      </SectionCard>

      <SectionCard title='金手指' extra={data.seclusionPassValid ? '已开通' : '未开通'}>
        <InfoRow label='到期时间' value={data.seclusionPassExpireText} valueColor={T.janglan} />
        <InfoRow label='剩余天数' value={`${data.seclusionPassRemainingDays} 天`} />
        <DescriptionBlock text={`修为与普通材料加成 · ${data.seclusionPriceText}`} />
        <HintBlock text='闭关修行、主线秘境、双修比试与悬赏，历练皆有助益。' />
        {!data.seclusionPassValid ? <RewardBlock title='开通即时奖励' rewards={data.seclusionRewards} emptyText='以当前金手指套餐配置为准' /> : null}
      </SectionCard>
    </PanelShell>
  );
}
