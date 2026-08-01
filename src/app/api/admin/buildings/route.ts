/**
 * GET  /api/admin/buildings  - 건물 목록
 * POST /api/admin/buildings  - 건물 추가
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return null;
  return session;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBuilding(row: any) {
  return {
    id:        row.id,
    name:      row.name,
    sortOrder: row.sort_order,
    isActive:  row.is_active,
    createdAt: row.created_at,
  };
}

export async function GET(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get('active') === 'true';

  let query = supabaseAdmin
    .from('buildings')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) {
    console.error('[GET /api/admin/buildings]', error);
    return NextResponse.json({ error: '건물 목록을 불러오지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(mapBuilding));
}

export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const body = await req.json() as { name?: string; sortOrder?: number };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: '건물명을 입력해주세요.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('buildings')
    .insert({ name, sort_order: body.sortOrder ?? 0 })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 존재하는 건물명입니다.' }, { status: 409 });
    }
    console.error('[POST /api/admin/buildings]', error);
    return NextResponse.json({ error: '건물 추가에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json(mapBuilding(data), { status: 201 });
}
