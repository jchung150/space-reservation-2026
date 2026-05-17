/**
 * POST /api/task-requests/[id]/photos
 * 업무 요청에 사진 업로드
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== 'staff') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;
  const form  = await req.formData();
  const files = form.getAll('photos') as File[];

  if (files.length === 0) return NextResponse.json({ paths: [] });

  const paths: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file        = files[i];
    const nameParts   = file.name.split('.');
    const ext         = nameParts.length > 1 ? nameParts.pop()!.toLowerCase() : 'jpg';
    const contentType = file.type || `image/${ext}`;
    const path        = `${id}/photo-${i}.${ext}`;
    const buffer      = Buffer.from(await file.arrayBuffer());

    const { error } = await supabaseAdmin.storage
      .from('request-photos')
      .upload(path, buffer, { contentType, upsert: true });

    if (!error) paths.push(path);
  }

  // photo_paths 업데이트
  if (paths.length > 0) {
    await supabaseAdmin
      .from('task_requests')
      .update({ photo_paths: paths })
      .eq('id', id);
  }

  return NextResponse.json({ paths });
}
