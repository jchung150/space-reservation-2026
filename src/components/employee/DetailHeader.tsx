'use client';

import { useRouter } from 'next/navigation';

interface Props {
  title: string;
}

export default function DetailHeader({ title }: Props) {
  const router = useRouter();

  return (
    <header
      className="flex items-center bg-white px-2"
      style={{
        height: 56,
        borderBottom: '1px solid oklch(88% 0.008 240)',
        flexShrink: 0,
      }}
    >
      {/* 뒤로 가기 */}
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1 rounded-lg px-2 transition-colors"
        style={{
          minHeight: 48,
          minWidth: 64,
          color: 'oklch(55% 0.14 195)',
          fontWeight: 600,
          fontSize: 15,
        }}
        aria-label="뒤로 가기"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        뒤로
      </button>

      {/* 제목 — 남은 공간 중앙 */}
      <h1
        className="flex-1 text-center"
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: 'oklch(18% 0.01 260)',
          marginRight: 64, /* 뒤로 버튼 너비만큼 상쇄해 정가운데 정렬 */
        }}
      >
        {title}
      </h1>
    </header>
  );
}
