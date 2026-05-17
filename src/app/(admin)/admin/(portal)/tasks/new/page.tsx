'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TaskFormPage from '@/components/admin/TaskFormPage';

function NewTaskPageContent() {
  const searchParams  = useSearchParams();
  const fromRequest   = searchParams.get('fromRequest') ?? undefined;
  const prefillTitle  = searchParams.get('title')    ?? undefined;
  const prefillDesc   = searchParams.get('desc')     ?? undefined;
  const prefillLocation = searchParams.get('location') ?? undefined;

  return (
    <TaskFormPage
      isEdit={false}
      fromRequestId={fromRequest}
      prefill={prefillTitle ? { title: prefillTitle, desc: prefillDesc, location: prefillLocation } : undefined}
    />
  );
}

export default function NewTaskPage() {
  return (
    <Suspense>
      <NewTaskPageContent />
    </Suspense>
  );
}
