import HotelAdminLayout from "@/components/layout/hotel-admin-layout"
export default function HotelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <HotelAdminLayout>{children}</HotelAdminLayout>
}