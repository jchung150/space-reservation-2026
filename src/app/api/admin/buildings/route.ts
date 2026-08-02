/**
 * GET  /api/admin/buildings  - 건물 목록
 * POST /api/admin/buildings  - 건물 추가
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';
import { BUILDING_TYPE_OPTIONS, type BuildingType } from '@/types';

const VALID_TYPES = new Set<string>(BUILDING_TYPE_OPTIONS);

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return null;
  return session;
}

// 썸네일 서명 URL 생성 (1시간 유효)
async function signThumbnail(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabaseAdmin.storage
    .from('building-thumbnails')
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function mapBuilding(row: any) {
  return {
    id:            row.id,
    name:          row.name,
    buildingTypes: (row.building_types ?? []) as BuildingType[],
    address:       row.address ?? null,
    builtAt:       row.built_at ?? null,
    approvedAt:    row.approved_at ?? null,
    thumbnailPath: row.thumbnail_path ?? null,
    thumbnailUrl:  await signThumbnail(row.thumbnail_path),
    sortOrder:     row.sort_order,
    isActive:      row.is_active,
    createdAt:     row.created_at,
  };
}

function normalizeTypes(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const filtered = input.filter((v): v is string => typeof v === 'string' && VALID_TYPES.has(v));
  return filtered.length > 0 ? filtered : null;
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

  const result = await Promise.all((data ?? []).map(mapBuilding));
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const body = await req.json() as {
    name?: string;
    buildingTypes?: string[];
    address?: string | null;
    builtAt?: string | null;
    approvedAt?: string | null;
    thumbnailPath?: string | null;
    sortOrder?: number;
  };

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: '건물명을 입력해주세요.' }, { status: 400 });
  }

  const types = normalizeTypes(body.buildingTypes);
  if (!types || types.length === 0) {
    return NextResponse.json({ error: '건물 구분을 하나 이상 선택해주세요.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('buildings')
    .insert({
      name,
      building_types: types,
      address:        body.address?.trim() || null,
      built_at:       body.builtAt        || null,
      approved_at:    body.approvedAt     || null,
      thumbnail_path: body.thumbnailPath  || null,
      sort_order:     body.sortOrder      ?? 0,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 존재하는 건물명입니다.' }, { status: 409 });
    }
    console.error('[POST /api/admin/buildings]', error);
    return NextResponse.json({ error: '건물 추가에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json(await mapBuilding(data), { status: 201 });
}
