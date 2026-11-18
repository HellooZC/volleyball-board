export type ToastValue = { id: number; text: string } | null

export function Toast({ toast }: { toast: ToastValue }) {
  if (!toast) return null
  return (
    <div
      key={toast.id}
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[max(24px,env(safe-area-inset-bottom))] z-40 mx-auto w-fit max-w-[calc(100vw-32px)] animate-rise rounded-full bg-ink px-4 py-2 text-sm font-bold text-bg shadow-lg"
    >
      {toast.text}
    </div>
  )
}
