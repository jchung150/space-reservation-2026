'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export default function LogoutButton({ className, style, children }: Props) {
  const router  = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    if (busy) return;
    setBusy(true);
    try {
      const res  = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await res.json();
      router.push(data.redirectTo ?? '/login');
      router.refresh();
    } catch {
      router.push('/login');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={busy}
      className={className}
      style={style}
    >
      {children}
    </button>
  );
}
