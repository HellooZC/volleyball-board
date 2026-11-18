import { useEffect, useState } from 'react'
import type { ToastValue } from '../components/Toast'

export function useToast() {
  const [toast, setToast] = useState<ToastValue>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])
  return [toast, (text: string) => setToast({ id: Date.now(), text })] as const
}

