import { Toaster } from 'sonner'
import "@/app/globals.css"
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="top-right"
          theme="dark"
          richColors
          closeButton
        />
      </body>
    </html>
  )
}