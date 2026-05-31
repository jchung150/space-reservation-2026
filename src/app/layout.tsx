import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const notoSansKR = Noto_Sans_KR({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans-kr',
});

export const metadata: Metadata = {
  title: '영준피엠씨 업무 협업 시스템',
  description: '영준피엠씨 현장 인력 업무 관리 및 협업 시스템',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: '영준피엠씨',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon',
  },
  themeColor: '#0d9488',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} h-full`}>
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
