import HotelSubAdminLayout from "@/components/layout/hotel-sub-admin-layout"

export default function SubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <HotelSubAdminLayout>{children}</HotelSubAdminLayout>
}