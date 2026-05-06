/**
 * GET /api/tasks/[id]
 * 직원이 자신에게 배정된 업무 단건 조회
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';
import { mapTask } from '@/lib/task-mapper';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== 'staff') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('*, admins:created_by_id(name)')
    .eq('id', id)
    .eq('assignee_id', session.id) // 본인 업무만 조회 가능
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '업무를 찾을 수 없습니다.' }, { status: 404 });
  }

  const task = mapTask(data);

  // reference_images storage 경로 → 서명 URL 변환
  const paths: string[] = (data as any).reference_images ?? [];
  if (paths.length > 0) {
    const signedUrls = await Promise.all(
      paths.map(async (path: string) => {
        const { data: signed } = await supabaseAdmin.storage
          .from('task-references')
          .createSignedUrl(path, 3600);
        return signed?.signedUrl ?? null;
      })
    );
    task.referenceImages = signedUrls.filter(Boolean) as string[];
  }

  return NextResponse.json(task);
}
