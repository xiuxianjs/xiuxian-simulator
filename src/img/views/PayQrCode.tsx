import type { ThemeConfig } from '@src/types/theme';
import * as React from 'react';
import { buildTokens, PanelFailure, PanelShell, SectionTitle } from './_panelShared';

/** 组件 Props */
export interface PayQrCodeProps {
  data?: {
    /** 二维码图片 base64 data URL */
    qrCodeDataUrl: string;
    /** 套餐名称 */
    packageName: string;
    /** 金额（元） */
    yuan: string;
    /** 订单号 */
    orderNo: string;
    theme?: ThemeConfig | null;
  };
}

export default function PayQrCode({ data }: PayQrCodeProps) {
  if (!data) {
    return <PanelFailure message='支付二维码加载失败' />;
  }

  const T = buildTokens(data.theme);
  const { qrCodeDataUrl = '', packageName = '', yuan = '', orderNo = '' } = data ?? {};

  return (
    <PanelShell theme={data.theme}>
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '16px 16px 14px',
          borderBottom: `2px solid ${T.borderMid}`,
          background: T.headerBg
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: T.inkDark, letterSpacing: '2px' }}>充值购买</span>
          <span style={{ fontSize: '13px', color: T.janglan }}>请在 5 分钟内完成支付</span>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '2px',
            border: `2px solid ${T.cinnabar}`,
            borderRadius: '10px 4px 8px 6px',
            padding: '8px 12px',
            background: 'linear-gradient(160deg, rgba(200,45,20,0.15) 0%, rgba(160,30,10,0.06) 100%)'
          }}
        >
          <span style={{ fontSize: '12px', color: T.cinnabar, letterSpacing: '2px' }}>金额</span>
          <span style={{ fontSize: '26px', fontWeight: 'bold', color: T.cinnabar, fontFamily: 'tttgbnumber, monospace', lineHeight: 1 }}>¥{yuan}</span>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          margin: '12px 12px 0',
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: '10px 4px 12px 5px',
          boxShadow: 'inset 0 1px 0 rgba(255,245,225,0.6), 0 2px 8px rgba(80,55,30,0.10)',
          overflow: 'hidden'
        }}
      >
        <SectionTitle title='订单信息' />
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '8px 10px',
              background: 'rgba(255,248,235,0.32)',
              border: `1px solid ${T.border}`,
              borderRadius: '6px 2px 5px 3px'
            }}
          >
            <span style={{ fontSize: '14px', color: T.inkLight }}>套餐</span>
            <span style={{ fontSize: '16px', color: T.inkDark, fontWeight: 'bold' }}>{packageName}</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '8px 10px',
              background: 'rgba(255,248,235,0.32)',
              border: `1px solid ${T.border}`,
              borderRadius: '6px 2px 5px 3px'
            }}
          >
            <span style={{ fontSize: '14px', color: T.inkLight }}>订单号</span>
            <span style={{ fontSize: '14px', color: T.inkDark, fontWeight: 'bold', fontFamily: 'monospace', textAlign: 'right' }}>{orderNo}</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '8px 10px',
              background: 'rgba(255,248,235,0.32)',
              border: `1px solid ${T.border}`,
              borderRadius: '6px 2px 5px 3px'
            }}
          >
            <span style={{ fontSize: '14px', color: T.inkLight }}>有效期</span>
            <span style={{ fontSize: '14px', color: T.amber, fontWeight: 'bold' }}>5 分钟</span>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          margin: '10px 12px 12px',
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: '5px 12px 4px 10px',
          boxShadow: 'inset 0 1px 0 rgba(255,245,225,0.6), 0 2px 8px rgba(80,55,30,0.10)',
          overflow: 'hidden'
        }}
      >
        <SectionTitle title='扫码支付' />
        <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px',
              border: `1px solid ${T.border}`,
              borderRadius: '10px 4px 12px 5px',
              boxShadow: '0 2px 8px rgba(80,55,30,0.10)'
            }}
          >
            <img src={qrCodeDataUrl} style={{ width: '240px', height: '240px' }} />
          </div>
          <span style={{ fontSize: '16px', color: T.janglan, fontWeight: 'bold' }}>请扫描二维码完成支付</span>
          <span style={{ fontSize: '13px', color: T.inkLight }}>支付完成后将自动发放奖励，请耐心等待</span>
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '8px 16px',
          textAlign: 'center',
          borderTop: `1px solid ${T.border}`,
          background: 'linear-gradient(180deg, rgba(200,185,155,0.10) 0%, rgba(215,200,170,0.22) 100%)'
        }}
      >
        <span style={{ fontSize: '12px', color: T.inkLight }}>若二维码失效，请重新发起充值指令生成新订单</span>
      </div>
    </PanelShell>
  );
}
