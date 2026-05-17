/**
 * POST /api/task-requests
 * 직원이 업무 요청을 등록
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'staff') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const body = await req.json() as {
    title: string;
    description?: string;
    priority: string;
    photoPaths: string[];
  };

  const { title, description, priority, photoPaths } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: '업무명을 입력해주세요.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('task_requests')
    .insert({
      title:           title.trim(),
      description:     description?.trim() ?? null,
      priority:        priority            ?? 'medium',
      submitted_by_id: session.id,
      photo_paths:     photoPaths          ?? [],
    })
    .select('id')
    .single();

  if (error) {
    console.error('[POST /api/task-requests]', error.message, error.details, error.hint);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
