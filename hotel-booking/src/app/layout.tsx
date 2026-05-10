import { Toaster } from 'sonner'
import "@/app/globals.css"
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
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
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          richColors
          closeButton
        />
      </body>
    </html>

  )
}