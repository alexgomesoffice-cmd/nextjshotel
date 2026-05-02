import { useCallback } from 'react'
import { toast as sonnerToast } from 'sonner'

export interface ToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  duration?: number
}

export function useToast() {
  const toast = useCallback((props: ToastProps) => {
    const { title, description, variant = 'default', duration = 4000 } = props

    const message = description ? `${title}\n${description}` : title

    if (variant === 'destructive') {
      sonnerToast.error(message, { duration })
    } else if (variant === 'success') {
      sonnerToast.success(message, { duration })
    } else {
      sonnerToast(message, { duration })
    }
  }, [])

  return { toast }
}