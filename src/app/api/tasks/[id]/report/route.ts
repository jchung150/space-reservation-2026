/**
 * POST /api/tasks/[id]/report
 * 직원이 완료 보고를 제출합니다.
 *
 * 처리 순서:
 *   1. reports 테이블에 보고 생성
 *   2. tasks.status = 'pending_review'  (완료 대기 — 관리자 검토 중)
 *   3. tasks.status = 'in_progress' → 이미 진행 중이거나 todo 상태 처리
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

  const { id: taskId } = await params;

  /* ── 1. 업무 존재 확인 + 본인 배정 확인 ── */
  const { data: task, error: taskErr } = await supabaseAdmin
    .from('tasks')
    .select('id, status, assignee_id')
    .eq('id', taskId)
    .single();

  if (taskErr || !task) {
    return NextResponse.json({ error: '업무를 찾을 수 없습니다.' }, { status: 404 });
  }

  if (task.assignee_id !== session.id) {
    return NextResponse.json({ error: '본인에게 배정된 업무만 보고할 수 있습니다.' }, { status: 403 });
  }

  if (task.status === 'done') {
    return NextResponse.json({ error: '이미 완료된 업무입니다.' }, { status: 400 });
  }

  if (task.status === 'pending_review') {
    return NextResponse.json({ error: '이미 검토 대기 중인 보고가 있습니다.' }, { status: 400 });
  }

  /* ── 2. 보고 내용 파싱 ──
     메모가 비어 있으면 기본 문구 사용, 내용이 있으면 그대로 저장
     (DB의 char_length 제약은 제거됨) */
  const body    = await req.json() as { memo?: string };
  const rawMemo = (body.memo ?? '').trim();
  const memo    = rawMemo || '완료 보고를 제출합니다.';

  /* ── 3. reports 테이블에 보고 생성 ── */
  const { data: report, error: reportErr } = await supabaseAdmin
    .from('reports')
    .insert({
      task_id:         taskId,
      submitted_by_id: session.id,
      memo,
      status:          'pending',
    })
    .select('id')
    .single();

  if (reportErr || !report) {
    console.error('[POST /api/tasks/report]', reportErr);
    return NextResponse.json({ error: '보고 생성에 실패했습니다.' }, { status: 500 });
  }

  /* ── 4. 업무 상태 → pending_review ── */
  const { error: updateErr } = await supabaseAdmin
    .from('tasks')
    .update({ status: 'pending_review' })
    .eq('id', taskId);

  if (updateErr) {
    console.error('[POST /api/tasks/report] task update error', updateErr);
    // 보고는 생성됐으므로 critical 오류는 아님 — 경고만
  }

  return NextResponse.json({ ok: true, reportId: report.id }, { status: 201 });
}
