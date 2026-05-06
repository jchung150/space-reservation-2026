/**
 * POST /api/admin/reports/[id]/archive
 * 승인된 보고를 아카이브로 이동합니다.
 *
 * 추가 동작: 반복 업무인 경우, 아카이브 후 다음 인스턴스를 자동 생성하여
 *   항상 미완료 N개를 유지합니다 (롤링 생성).
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';
import { ensureAheadInstances } from '@/lib/repeat-tasks';
import type { RepeatType } from '@/types';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id: reportId } = await params;

  /* 보고 조회 → task_id 확인 */
  const { data: report, error: rErr } = await supabaseAdmin
    .from('reports')
    .select('id, status, task_id')
    .eq('id', reportId)
    .single();

  if (rErr || !report) {
    return NextResponse.json({ error: '보고를 찾을 수 없습니다.' }, { status: 404 });
  }

  if (report.status !== 'approved') {
    return NextResponse.json({ error: '승인된 보고만 저장할 수 있습니다.' }, { status: 400 });
  }

  /* 연관 업무 조회 (반복 설정 확인용) */
  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('id, parent_task_id, repeat_type')
    .eq('id', report.task_id)
    .single();

  /* 연관 업무 아카이브 처리 */
  const { error: tErr } = await supabaseAdmin
    .from('tasks')
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .eq('id', report.task_id);

  if (tErr) {
    console.error('[archive report]', tErr);
    return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
  }

  /* ── 반복 업무: 다음 인스턴스 롤링 생성 ── */
  if (task && task.repeat_type && task.repeat_type !== 'none') {
    try {
      await ensureAheadInstances({
        id:             task.id,
        parent_task_id: task.parent_task_id,
        repeat_type:    task.repeat_type as RepeatType,
      });
    } catch (e) {
      // 롤링 생성 실패는 아카이브 자체를 취소하지 않음 (로그만 남김)
      console.error('[archive] 반복 인스턴스 생성 실패', e);
    }
  }

  return NextResponse.json({ ok: true });
}
