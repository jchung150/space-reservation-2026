/**
 * GET  /api/admin/staff  - 직원 목록 (업무 배정용: 활성만 / 관리용: 전체)
 * POST /api/admin/staff  - 직원 생성
 */
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

const DEPT_MAP: Record<string, string> = {
  security:    '보안',
  cleaning:    '청소',
  maintenance: '시설유지보수',
};

async function requireAdmin() {
  const s = await getSession();
  return s?.role === 'admin' ? s : null;
}

/* ── GET ────────────────────────────────────────────────── */
export async function GET(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const all = searchParams.get('all') === 'true'; // 비활성 포함 여부

  let query = supabaseAdmin
    .from('staff')
    .select('id, name, job_types, is_active, phone, login_id, joined_at')
    .order('name');

  if (!all) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data.map(s => ({
    id:       s.id,
    name:     s.name,
    jobTypes: s.job_types ?? [],
    depts:    (s.job_types ?? []).map((jt: string) => DEPT_MAP[jt] ?? jt),
    isActive: s.is_active,
    phone:    s.phone ?? '',
    loginId:  s.login_id,
    joinedAt: s.joined_at,
  })));
}

/* ── POST ───────────────────────────────────────────────── */
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });

  const { name, jobTypes, phone, loginId, password } = await req.json() as {
    name?: string; jobTypes?: string[]; phone?: string;
    loginId?: string; password?: string;
  };

  if (!name?.trim() || !loginId?.trim() || !password || !jobTypes?.length) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { data, error } = await supabaseAdmin
    .from('staff')
    .insert({
      name:          name.trim(),
      login_id:      loginId.trim(),
      password_hash: passwordHash,
      job_types:     jobTypes,
      phone:         phone ?? null,
    })
    .select('id, name, job_types, is_active, phone, login_id, joined_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
