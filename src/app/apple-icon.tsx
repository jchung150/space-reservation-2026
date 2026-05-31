import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180,
        height: 180,
        background: 'linear-gradient(145deg, #0ea5a0 0%, #0d9488 100%)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 20px 20px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ width: 30, height: 68, background: 'rgba(255,255,255,0.72)', borderRadius: '4px 4px 0 0' }} />
          <div style={{ width: 40, height: 92, background: 'white', borderRadius: '4px 4px 0 0' }} />
          <div style={{ width: 30, height: 52, background: 'rgba(255,255,255,0.72)', borderRadius: '4px 4px 0 0' }} />
        </div>
        <div style={{ width: 130, height: 3, background: 'rgba(255,255,255,0.4)', borderRadius: 2 }} />
      </div>
    </div>,
    { ...size },
  );
}
