/**
 * POST /api/tasks/[id]/images
 * 직원이 자신의 업무에 참고 이미지 업로드
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

  const MAX_FILES  = 5;
  const MAX_BYTES  = 10 * 1024 * 1024; // 10MB

  const { id } = await params;
  const form  = await req.formData();
  const files = form.getAll('images') as File[];
  if (files.length === 0) return NextResponse.json({ paths: [] });
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `이미지는 최대 ${MAX_FILES}장까지 업로드할 수 있습니다.` }, { status: 400 });
  }

  const paths: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file        = files[i];
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: '파일 크기는 10MB를 초과할 수 없습니다.' }, { status: 400 });
    }
    const nameParts   = file.name.split('.');
    const ext         = nameParts.length > 1 ? nameParts.pop()!.toLowerCase() : 'jpg';
    const contentType = file.type || `image/${ext}`;
    const path        = `references/${id}-${i}.${ext}`;
    const buffer      = Buffer.from(await file.arrayBuffer());

    const { error } = await supabaseAdmin.storage
      .from('task-references')
      .upload(path, buffer, { contentType, upsert: true });

    if (!error) paths.push(path);
  }

  if (paths.length > 0) {
    await supabaseAdmin
      .from('tasks')
      .update({ reference_images: paths })
      .eq('id', id)
      .eq('assignee_id', session.id);
  }

  return NextResponse.json({ paths });
}
