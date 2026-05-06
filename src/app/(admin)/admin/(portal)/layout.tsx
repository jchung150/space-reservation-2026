import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'oklch(95% 0.005 220)',
      }}
    >
      <AdminSidebar />
      <main
        className="admin-scroll"
        style={{ flex: 1, overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column' }}
      >
        {children}
      </main>
    </div>
  );
}
