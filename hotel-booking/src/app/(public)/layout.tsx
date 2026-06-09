import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import SmoothScroll from "@/components/ui/SmoothScroll"

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    
    </>
  )
}