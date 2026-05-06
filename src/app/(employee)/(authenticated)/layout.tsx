import BottomTabNav from '@/components/employee/BottomTabNav';

export default function AuthenticatedEmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col bg-white">
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      <BottomTabNav />
    </div>
  );
}
