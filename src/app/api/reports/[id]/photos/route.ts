/**
 * POST /api/reports/[id]/photos
 * 완료 보고에 사진을 업로드합니다.
 *
 * - Supabase Storage 버킷: report-photos
 * - 저장 경로: {reportId}/photo-{index}.{ext}
 * - report_photos 테이블에 경로 저장
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

const BUCKET = 'report-photos';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== 'staff') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id: reportId } = await params;

  /* 보고가 본인 것인지 확인 */
  const { data: report, error: reportErr } = await supabaseAdmin
    .from('reports')
    .select('id, submitted_by_id')
    .eq('id', reportId)
    .single();

  if (reportErr || !report) {
    return NextResponse.json({ error: '보고를 찾을 수 없습니다.' }, { status: 404 });
  }
  if (report.submitted_by_id !== session.id) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  /* FormData에서 파일 목록 추출 */
  const formData = await req.formData();
  const files    = formData.getAll('photos') as File[];

  if (files.length === 0) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  const inserted: { report_id: string; storage_path: string; file_name: string; sort_order: number }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file   = files[i];
    const ext    = file.type === 'image/png' ? 'png' : file.type === 'image/heic' ? 'heic' : 'jpg';
    const path   = `${reportId}/photo-${i}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadErr) {
      console.error(`[photos] upload failed: ${path}`, uploadErr.message);
      continue; // 실패한 사진은 건너뜀
    }

    inserted.push({
      report_id:    reportId,
      storage_path: path,
      file_name:    file.name || `photo-${i}`,
      sort_order:   i,
    });
  }

  if (inserted.length > 0) {
    await supabaseAdmin.from('report_photos').insert(inserted);
  }

  return NextResponse.json({ ok: true, count: inserted.length });
}
