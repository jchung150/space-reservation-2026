/**
 * PATCH  /api/admin/buildings/[id]  - 건물 수정
 * DELETE /api/admin/buildings/[id]  - 건물 삭제 (사용 중인 경우 차단)
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';
import { BUILDING_TYPE_OPTIONS } from '@/types';

const VALID_TYPES = new Set<string>(BUILDING_TYPE_OPTIONS);

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return null;
  return session;
}

function normalizeTypes(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const filtered = input.filter((v): v is string => typeof v === 'string' && VALID_TYPES.has(v));
  return filtered.length > 0 ? filtered : null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as {
    name?: string;
    buildingTypes?: string[];
    address?: string | null;
    builtAt?: string | null;
    approvedAt?: string | null;
    thumbnailPath?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  };

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const trimmed = body.name.trim();
    if (!trimmed) return NextResponse.json({ error: '건물명을 입력해주세요.' }, { status: 400 });
    update.name = trimmed;
  }
  if (body.buildingTypes !== undefined) {
    const types = normalizeTypes(body.buildingTypes);
    if (!types || types.length === 0) {
      return NextResponse.json({ error: '건물 구분을 하나 이상 선택해주세요.' }, { status: 400 });
    }
    update.building_types = types;
  }
  if (body.address       !== undefined) update.address        = body.address?.trim() || null;
  if (body.builtAt       !== undefined) update.built_at       = body.builtAt        || null;
  if (body.approvedAt    !== undefined) update.approved_at    = body.approvedAt     || null;
  if (body.thumbnailPath !== undefined) update.thumbnail_path = body.thumbnailPath  || null;
  if (body.sortOrder     !== undefined) update.sort_order     = body.sortOrder;
  if (body.isActive      !== undefined) update.is_active      = body.isActive;

  const { data, error } = await supabaseAdmin
    .from('buildings')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 존재하는 건물명입니다.' }, { status: 409 });
    }
    console.error('[PATCH /api/admin/buildings]', error);
    return NextResponse.json({ error: '건물 수정에 실패했습니다.' }, { status: 500 });
  }

  // 썸네일 서명 URL 포함해 반환
  let thumbnailUrl: string | null = null;
  if (data.thumbnail_path) {
    const { data: signed } = await supabaseAdmin.storage
      .from('building-thumbnails')
      .createSignedUrl(data.thumbnail_path, 3600);
    thumbnailUrl = signed?.signedUrl ?? null;
  }

  return NextResponse.json({
    id:            data.id,
    name:          data.name,
    buildingTypes: data.building_types ?? [],
    address:       data.address ?? null,
    builtAt:       data.built_at ?? null,
    approvedAt:    data.approved_at ?? null,
    thumbnailPath: data.thumbnail_path ?? null,
    thumbnailUrl,
    sortOrder:     data.sort_order,
    isActive:      data.is_active,
    createdAt:     data.created_at,
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;

  // 사용 중인지 확인 — 하나라도 있으면 삭제 차단
  const { count, error: countErr } = await supabaseAdmin
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('building_id', id);

  if (countErr) {
    console.error('[DELETE /api/admin/buildings] count', countErr);
    return NextResponse.json({ error: '건물 사용 여부를 확인하지 못했습니다.' }, { status: 500 });
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json({
      error: `이 건물은 ${count}건의 업무에서 사용 중이라 삭제할 수 없습니다. 대신 비활성화하세요.`,
    }, { status: 409 });
  }

  // 썸네일이 있으면 storage에서 삭제
  const { data: b } = await supabaseAdmin
    .from('buildings').select('thumbnail_path').eq('id', id).single();
  if (b?.thumbnail_path) {
    await supabaseAdmin.storage.from('building-thumbnails').remove([b.thumbnail_path]);
  }

  const { error } = await supabaseAdmin.from('buildings').delete().eq('id', id);
  if (error) {
    console.error('[DELETE /api/admin/buildings]', error);
    return NextResponse.json({ error: '건물 삭제에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
