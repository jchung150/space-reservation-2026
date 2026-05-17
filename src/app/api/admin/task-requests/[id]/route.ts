/**
 * PATCH /api/admin/task-requests/[id]
 * 업무 요청 처리: convert(업무로 전환) | reject(반려)
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from('task_requests')
    .select('*, staff:submitted_by_id(name, job_types)')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '요청을 찾을 수 없습니다.' }, { status: 404 });
  }

  // photo_paths → signed URLs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paths: string[] = (data as any).photo_paths ?? [];
  const photoUrls = await Promise.all(
    paths.map(async (path: string) => {
      const { data: signed } = await supabaseAdmin.storage
        .from('request-photos')
        .createSignedUrl(path, 3600);
      return signed?.signedUrl ?? null;
    })
  ).then(urls => urls.filter(Boolean) as string[]);

  return NextResponse.json({ ...data, photoUrls });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;
  const { action, rejectReason } = await req.json() as {
    action: 'reject';
    rejectReason?: string;
  };

  if (action === 'reject') {
    if (!rejectReason?.trim()) {
      return NextResponse.json({ error: '반려 사유를 입력해주세요.' }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from('task_requests')
      .update({ status: 'rejected', reject_reason: rejectReason.trim() })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: '잘못된 action입니다.' }, { status: 400 });
}
