/**
 * PATCH /api/staff/password
 * 직원 비밀번호 변경 — 현재 비밀번호 확인 후 새 비밀번호로 교체
 */
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'staff') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { currentPassword, newPassword } = await req.json() as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: '새 비밀번호는 6자 이상이어야 합니다.' }, { status: 400 });
  }

  const { data: staff, error } = await supabaseAdmin
    .from('staff')
    .select('password_hash')
    .eq('id', session.id)
    .single();

  if (error || !staff) {
    return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
  }

  const isValid = await bcrypt.compare(currentPassword, staff.password_hash);
  if (!isValid) {
    return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  const newHash = await bcrypt.hash(newPassword, 10);

  const { error: updateError } = await supabaseAdmin
    .from('staff')
    .update({ password_hash: newHash })
    .eq('id', session.id);

  if (updateError) {
    console.error('[PATCH /api/staff/password]', updateError);
    return NextResponse.json({ error: '비밀번호 변경에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
