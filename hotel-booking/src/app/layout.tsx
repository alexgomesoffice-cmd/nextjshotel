import { Toaster } from 'sonner'
import "@/app/globals.css"
import SmoothScroll from '@/components/ui/SmoothScroll'
import Script from 'next/script'
import { SocketProvider } from '@/hooks/useSocket'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          id="theme-script"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('theme');
                var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches === true;
                if (!theme && supportDarkMode) theme = 'dark';
                if (!theme && !supportDarkMode) theme = 'light';
                
                if (theme === 'light') {
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <SocketProvider>
          <SmoothScroll> 
          {children}
          </SmoothScroll>
          <Toaster
            position="bottom-right"
            theme="dark"
            richColors
            closeButton
          />
        </SocketProvider>
      </body>
    </html>

  )
}