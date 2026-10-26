import type { ThemeConfig } from '@src/types/theme';
import classNames from 'classnames';
import * as React from 'react';
import { buildTokens, PanelFailure, PanelShell, SectionTitle, ThemeContext } from './_panelShared';

export interface PrivilegeItem {
  text: string;
  unlocked: boolean;
  needText?: string;
}

export interface PrivilegesPanelData {
  avatarURL?: string;
  name: string;
  vipLevel: number;
  totalRechargeAmount: number;
  vipPrivileges: PrivilegeItem[];
  monthCardPrivileges: PrivilegeItem[];
  hasMonthCard: boolean;
  theme?: ThemeConfig | null;
}

interface Props {
  data?: PrivilegesPanelData;
}

type GroupedPrivilegeItem = PrivilegeItem & {
  displayText: string;
};

type PrivilegeGroup = {
  label: string;
  items: GroupedPrivilegeItem[];
};

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

function HeroHeader({ data }: { data: PrivilegesPanelData }) {
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
        <span className={classNames('text-[14px]')} style={{ color: T.janglan }}>
          累计充值 {data.totalRechargeAmount.toFixed(0)} 元
        </span>
        <div className={classNames('flex flex-wrap items-center gap-2')}>
          <span
            className={classNames('rounded-[4px] px-[9px] py-[2px] text-[14px] font-bold tracking-[1px] text-white')}
            style={{
              background: T.cinnabar
            }}
          >
            VIP {data.vipLevel}
          </span>
          <span className={classNames('text-[13px]')} style={{ color: data.hasMonthCard ? T.green : T.inkLight }}>
            {data.hasMonthCard ? '月卡已开通' : '月卡未开通'}
          </span>
        </div>
      </div>
    </div>
  );
}

function groupPrivileges(items: PrivilegeItem[], fallbackLabel: string) {
  const groups: PrivilegeGroup[] = [];
  const groupMap = new Map<string, PrivilegeGroup>();

  for (const item of items) {
    const match = item.text.match(/^(V\d+\+)/i);
    const label = match?.[1]?.toUpperCase() ?? fallbackLabel;
    const displayText = match ? item.text.slice(match[1].length).trim() : item.text;
    const normalizedItem: GroupedPrivilegeItem = {
      ...item,
      displayText: displayText || item.text
    };

    let group = groupMap.get(label);

    if (!group) {
      group = { label, items: [] };
      groupMap.set(label, group);
      groups.push(group);
    }

    group.items.push(normalizedItem);
  }

  return groups;
}

function PrivilegeGroupRow({ group }: { group: PrivilegeGroup }) {
  const T = React.useContext(ThemeContext);

  return (
    <div
      className={classNames('flex items-start gap-[10px] px-4 py-[5px]')}
      style={{
        borderTop: `1px solid ${T.divider}`
      }}
    >
      <span
        className={classNames('mt-[2px] min-w-[40px] shrink-0 whitespace-nowrap rounded-full px-2 py-[3px] text-center text-[12px] font-bold')}
        style={{
          background: 'rgba(82,111,122,0.12)',
          border: `1px solid ${T.borderCool}`,
          color: T.janglan,
          textAlign: 'center'
        }}
      >
        {group.label}
      </span>
      <div className={classNames('flex flex-1 flex-col gap-[5px]')}>
        {group.items.map((item, index) => (
          <div key={`${group.label}-${index}`} className={classNames('flex items-start gap-2')}>
            <span className={classNames('mt-[1px] shrink-0 text-[15px]')}>{item.unlocked ? '' : '🔒'}</span>
            <div className={classNames('flex-1')}>
              <span className={classNames('text-[15px] leading-[1.5]')} style={{ color: item.unlocked ? T.inkDark : T.inkLight }}>
                {item.displayText}
              </span>
              {!item.unlocked && item.needText ? (
                <span className={classNames('ml-[6px] text-[13px]')} style={{ color: T.amber }}>
                  {item.needText}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PrivilegesPanel({ data }: Props) {
  if (!data) {
    return <PanelFailure message='特权数据加载失败' />;
  }

  const T = buildTokens(data.theme);
  const vipGroups = groupPrivileges(data.vipPrivileges, 'VIP');
  const monthCardGroups = groupPrivileges(data.monthCardPrivileges, '月卡');

  return (
    <PanelShell theme={data.theme}>
      <HeroHeader data={data} />

      <SectionCard title='VIP特权' extra={`VIP ${data.vipLevel}`}>
        {vipGroups.length > 0 ? (
          vipGroups.map(group => <PrivilegeGroupRow key={group.label} group={group} />)
        ) : (
          <div className={classNames('px-4 py-[14px] text-[15px]')} style={{ color: T.inkLight }}>
            暂无 VIP 特权
          </div>
        )}
      </SectionCard>

      <SectionCard title='月卡特权' extra={data.hasMonthCard ? '已开通' : '未开通'}>
        {monthCardGroups.length > 0 ? (
          monthCardGroups.map(group => <PrivilegeGroupRow key={group.label} group={group} />)
        ) : (
          <div className={classNames('px-4 py-[14px] text-[15px]')} style={{ color: T.inkLight }}>
            暂无月卡特权
          </div>
        )}
      </SectionCard>
    </PanelShell>
  );
}
