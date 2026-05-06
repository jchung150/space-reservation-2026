/**
 * 서버 전용 Supabase 클라이언트 (service_role 키 사용)
 * - RLS 우회 가능
 * - 서버 컴포넌트 / API Route에서만 import할 것
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
}

export const supabaseAdmin = createClient(url, key, {
  auth: { persistSession: false },
});
