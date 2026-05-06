'use client';

import { use, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import TaskFormPage, { type TaskFormInitialData } from '@/components/admin/TaskFormPage';

export default function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [initialData, setInitialData] = useState<TaskFormInitialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound_, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/tasks/${id}`)
      .then(async r => {
        if (r.status === 404) { setNotFound(true); return; }
        const task = await r.json();
        const due  = new Date(task.deadline);
        const urls: string[]  = task.referenceImages     ?? [];
        const paths: string[] = task.referenceImagePaths ?? [];
        setInitialData({
          taskId:         task.id,
          title:          task.title,
          desc:           task.description,
          priority:       task.priority,
          dueDate:        `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2,'0')}-${String(due.getDate()).padStart(2,'0')}`,
          dueTime:        `${String(due.getHours()).padStart(2,'0')}:${String(due.getMinutes()).padStart(2,'0')}`,
          assigneeId:     task.assigneeId,
          existingImages: urls.map((url, i) => ({ url, path: paths[i] ?? '' })),
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'oklch(65% 0.01 260)', fontSize: 14 }}>불러오는 중...</div>;
  }
  if (notFound_ || !initialData) return notFound();

  return <TaskFormPage isEdit={true} initialData={initialData} />;
}
