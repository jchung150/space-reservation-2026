'use client';

import { useEffect } from 'react';

interface Props {
  images: string[];
  index: number;
  onClose: () => void;
  onNav: (i: number) => void;
}

export default function ImageLightbox({ images, index, onClose, onNav }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')    onClose();
      if (e.key === 'ArrowLeft'  && index > 0)              onNav(index - 1);
      if (e.key === 'ArrowRight' && index < images.length - 1) onNav(index + 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, images.length, onClose, onNav]);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'oklch(5% 0 0 / 92%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}
    >
      {/* 이미지 + 화살표 */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, maxWidth: '90vw' }}
      >
        {/* 이전 */}
        <button
          type="button"
          onClick={() => onNav(index - 1)}
          disabled={index === 0}
          style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: index === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.25)', color: '#fff', cursor: index === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: '150ms ease' }}
          aria-label="이전 이미지"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        {/* 이미지 */}
        <img
          src={images[index]}
          alt={`이미지 ${index + 1}`}
          style={{ maxWidth: '80vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12, display: 'block' }}
        />

        {/* 다음 */}
        <button
          type="button"
          onClick={() => onNav(index + 1)}
          disabled={index === images.length - 1}
          style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: index === images.length - 1 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.25)', color: '#fff', cursor: index === images.length - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: '150ms ease' }}
          aria-label="다음 이미지"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* 카운터 + 닫기 안내 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        {images.length > 1 && (
          <div style={{ display: 'flex', gap: 6 }}>
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={e => { e.stopPropagation(); onNav(i); }}
                style={{ width: 7, height: 7, borderRadius: '50%', border: 'none', background: i === index ? '#fff' : 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 0, transition: '150ms ease' }}
              />
            ))}
          </div>
        )}
        <span style={{ color: 'oklch(65% 0 0)', fontSize: 13 }}>
          {images.length > 1 ? `${index + 1} / ${images.length} · ` : ''}탭하면 닫힙니다
        </span>
      </div>
    </div>
  );
}
