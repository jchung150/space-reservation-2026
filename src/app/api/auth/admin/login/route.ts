import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase-server';
import { signToken, sessionCookie } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { loginId, password } = await req.json() as {
      loginId?: string;
      password?: string;
    };

    if (!loginId?.trim() || !password) {
      return NextResponse.json({ error: '아이디와 비밀번호를 입력해주세요.' }, { status: 400 });
    }

    const { data: admin, error } = await supabaseAdmin
      .from('admins')
      .select('id, name, password_hash, is_active, role')
      .eq('login_id', loginId.trim())
      .single();

    const isValid = !error && admin && await bcrypt.compare(password, admin.password_hash);

    if (!isValid) {
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 },
      );
    }

    if (!admin.is_active) {
      return NextResponse.json({ error: '비활성화된 계정입니다.' }, { status: 403 });
    }

    const token = await signToken({
      id:        admin.id,
      role:      'admin',
      name:      admin.name,
      adminRole: admin.role as 'super' | 'admin',
    });

    const res = NextResponse.json({ ok: true, name: admin.name, adminRole: admin.role });
    res.cookies.set(sessionCookie(token));
    return res;

  } catch (err) {
    console.error('[admin/login]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
