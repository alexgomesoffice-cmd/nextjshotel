import AdminLayout from '@/components/layout/admin-layout'

export default function SystemLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminLayout>{children}</AdminLayout>
}