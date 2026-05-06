/**
 * POST /api/admin/reference-images
 * 업무 참고 이미지 업로드 → Supabase Storage 저장 후 경로 반환
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

const MAX_FILES    = 5;
const MAX_BYTES    = 10 * 1024 * 1024; // 10 MB
const VALID_TYPES  = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const form = await req.formData();
  const files = form.getAll('images') as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: '업로드할 파일이 없습니다.' }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `이미지는 최대 ${MAX_FILES}장까지 업로드할 수 있습니다.` }, { status: 400 });
  }

  const paths: string[] = [];

  for (const file of files) {
    if (!VALID_TYPES.has(file.type) && !file.name.match(/\.(heic|heif)$/i)) {
      return NextResponse.json({ error: 'JPG, PNG, WEBP, HEIC 형식만 업로드할 수 있습니다.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: '파일 크기는 10MB를 초과할 수 없습니다.' }, { status: 400 });
    }

    const ext  = file.name.split('.').pop() ?? 'jpg';
    const path = `references/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buf  = Buffer.from(await file.arrayBuffer());

    const { error } = await supabaseAdmin.storage
      .from('task-references')
      .upload(path, buf, { contentType: file.type, upsert: false });

    if (error) {
      console.error('[POST /api/admin/reference-images]', error);
      return NextResponse.json({ error: '이미지 업로드에 실패했습니다.' }, { status: 500 });
    }

    paths.push(path);
  }

  return NextResponse.json({ paths });
}
