import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Next.js 라우터 캐시 유효 기간
    // dynamic: 페이지 재검증 없이 유지되는 시간(초)
    // 짧을수록 탭 전환 시 서버 재요청이 잦아져 세션 검증 부담 증가
    staleTimes: {
      dynamic: 60,   // 60초 → 탭 전환 직후 즉시 재검증하지 않음
      static:  300,  // 5분
    },
  },
};

export default nextConfig;
