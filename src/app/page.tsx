import { redirect } from 'next/navigation';

export default function RootPage() {
  // 기본 진입점: 직원 로그인
  // 관리자는 /admin/login 으로 직접 접속
  redirect('/login');
}
