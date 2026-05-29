'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import ImageLightbox from '@/components/ImageLightbox';

const C = {
  primary:   'oklch(55% 0.14 195)',
  border:    'oklch(88% 0.008 240)',
  pageBg:    'oklch(95% 0.005 220)',
  textPri:   'oklch(18% 0.01 260)',
  textSec:   'oklch(50% 0.01 260)',
  textMuted: 'oklch(65% 0.01 260)',
};

export default function ArchiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params);
  const router  = useRouter();
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['archive-detail', id],
    queryFn: () => fetch(`/api/admin/archive/${id}`).then(r => {
      if (!r.ok) throw new Error('fetch error');
      return r.json();
    }),
    staleTime: 0,
  });

  if (isLoading) return (
    <div className="admin-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: C.textMuted, fontSize: 14 }}>불러오는 중...</span>
    </div>
  );

  if (isError || !report) return (
    <div className="admin-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'oklch(62% 0.16 25)', fontSize: 14 }}>업무를 찾을 수 없습니다.</span>
    </div>
  );

  return (
    <div className="admin-scroll" style={{ flex: 1, overflowY: 'auto', background: C.pageBg, minWidth: 0 }}>

      {/* 툴바 (인쇄 제외 영역) */}
      <div className="no-print" style={{ padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderBottom: `1px solid ${C.border}` }}>
        <button type="button" onClick={() => router.push('/admin/archive')}
          style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSec, flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.textPri, flex: 1 }}>업무 완료 보고서</span>
        <button type="button" onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          인쇄 / PDF 저장
        </button>
      </div>

      {/* ── 보고서 본문 ── */}
      <div id="print-area" style={{ maxWidth: 800, margin: '32px auto', background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 2px 12px oklch(0% 0 0 / 6%)' }}>

        {/* 보고서 헤더 */}
        <div style={{ background: C.primary, padding: '28px 40px', color: '#fff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', opacity: 0.8, marginBottom: 8 }}>영준피엠씨 · 업무 완료 보고서</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{report.title}</h1>
          <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 13, opacity: 0.85, flexWrap: 'wrap' }}>
            <span>완료일: {report.completedAt}</span>
            <span>검토자: {report.reviewer}</span>
          </div>
        </div>

        <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* 업무 기본 정보 */}
          <section>
            <SectionTitle>업무 정보</SectionTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {[
                  { label: '담당자',  value: report.employee },
                  { label: '직군',   value: report.dept },
                  { label: '우선순위', value: report.priority },
                  { label: '마감일시', value: report.deadline },
                  { label: '배정자',  value: report.assignedBy },
                  { label: '배정일',  value: report.assignedAt },
                  { label: '완료일시', value: report.completedAt },
                ].map(row => (
                  <tr key={row.label} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '10px 16px 10px 0', color: C.textMuted, fontWeight: 600, width: 100, verticalAlign: 'top' }}>{row.label}</td>
                    <td style={{ padding: '10px 0', color: C.textPri, fontWeight: 500 }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* 업무 설명 */}
          {report.description && (
            <section>
              <SectionTitle>업무 설명</SectionTitle>
              <p style={{ fontSize: 14, color: C.textPri, lineHeight: 1.8, margin: 0, padding: '14px 16px', background: C.pageBg, borderRadius: 8, whiteSpace: 'pre-line' }}>
                {report.description}
              </p>
            </section>
          )}

          {/* 참고 이미지 */}
          {report.referenceImages?.length > 0 && (
            <section>
              <SectionTitle>참고 이미지</SectionTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {report.referenceImages.map((url: string, i: number) => (
                  <button key={i} type="button" onClick={() => setLightbox({ images: report.referenceImages, index: i })}
                    style={{ width: 110, height: 110, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: `1px solid ${C.border}`, cursor: 'pointer', padding: 0 }}>
                    <img src={url} alt={`참고 이미지 ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 완료 보고 메모 */}
          {report.memo && (
            <section>
              <SectionTitle>완료 메모</SectionTitle>
              <p style={{ fontSize: 14, color: C.textPri, lineHeight: 1.8, margin: 0, padding: '14px 16px', background: C.pageBg, borderRadius: 8, whiteSpace: 'pre-line' }}>
                {report.memo}
              </p>
            </section>
          )}

          {/* 제출 사진 */}
          {report.submittedPhotos?.length > 0 && (
            <section>
              <SectionTitle>제출 사진 ({report.submittedPhotos.length}장)</SectionTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {report.submittedPhotos.map((url: string, i: number) => (
                  <button key={i} type="button" onClick={() => setLightbox({ images: report.submittedPhotos, index: i })}
                    style={{ width: 110, height: 110, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: `1px solid ${C.border}`, cursor: 'pointer', padding: 0 }}>
                    <img src={url} alt={`제출 사진 ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 이전 제출 이력 */}
          {report.rejectionHistory?.length > 0 && (
            <section>
              <SectionTitle>이전 제출 이력 ({report.rejectionHistory.length}건)</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {report.rejectionHistory.map((h: { index: number; memo: string; rejectReason: string; submittedAt: string; rejectedAt: string; photos: string[] }) => (
                  <div key={h.index} style={{ border: `1px solid oklch(88% 0.06 25)`, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ background: 'oklch(95% 0.04 25)', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'oklch(62% 0.16 25)' }}>{h.index}차 제출 · 반려됨</span>
                      <span style={{ fontSize: 11, color: 'oklch(55% 0.1 25)' }}>{h.submittedAt}</span>
                    </div>
                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {h.memo && (
                        <p style={{ margin: 0, fontSize: 13, color: C.textPri, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{h.memo}</p>
                      )}
                      {h.photos?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {h.photos.map((url: string, pi: number) => (
                            <button key={pi} type="button"
                              onClick={() => setLightbox({ images: h.photos, index: pi })}
                              style={{ width: 90, height: 90, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}`, cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                              <img src={url} alt={`${h.index}차 제출 사진 ${pi + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            </button>
                          ))}
                        </div>
                      )}
                      {h.rejectReason && (
                        <div style={{ background: 'oklch(95% 0.04 25)', borderRadius: 8, padding: '8px 12px', borderLeft: '3px solid oklch(62% 0.16 25)' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'oklch(62% 0.16 25)', marginBottom: 3 }}>반려 사유</div>
                          <div style={{ fontSize: 12, color: 'oklch(62% 0.16 25)', lineHeight: 1.6 }}>{h.rejectReason}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 서명란 */}
          <section style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 24, justifyContent: 'flex-end' }}>
              {[{ label: '담당자', value: report.employee }, { label: '검토자', value: report.reviewer }].map(s => (
                <div key={s.label} style={{ textAlign: 'center', minWidth: 120 }}>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 48 }}>{s.label}: {s.value}</div>
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 6, fontSize: 12, color: C.textMuted }}>서명</div>
                </div>
              ))}
            </div>
          </section>

          {/* 보고서 하단 */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.textMuted }}>
            <span>영준피엠씨</span>
            <span>출력일: {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNav={i => setLightbox({ ...lightbox, index: i })}
        />
      )}

    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: 'oklch(50% 0.01 260)', letterSpacing: '0.05em', marginBottom: 12, paddingBottom: 6, borderBottom: '2px solid oklch(55% 0.14 195)' }}>
      {children}
    </div>
  );
}
