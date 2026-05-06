'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,  // 30초
            retry: 1,
            // 탭 포커스 시 자동 재요청 비활성화
            // (탭 전환 후 돌아올 때 세션 검증 요청이 쏟아져 로그인 리다이렉트가 발생하는 문제 방지)
            // 실시간 갱신이 필요한 곳은 refetchInterval을 통해 주기적으로 처리
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
