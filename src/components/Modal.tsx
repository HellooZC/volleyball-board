import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './Icons'

/** 通用弹窗（原生 dialog：自带焦点管理和 Esc 关闭） */
export function Modal({
  open,
  onClose,
  title,
  children,
  width = 'w-[min(520px,calc(100vw-32px))]',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-label={title}
      className={'m-auto rounded-2xl border border-line bg-panel p-0 text-ink shadow-2xl backdrop:bg-black/40 open:animate-rise ' + width}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="text-base font-bold">{title}</h2>
            <button className="btn size-9 min-h-9 p-0" onClick={onClose} aria-label="关闭">
              <Icon name="close" />
            </button>
          </div>
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto p-4">{children}</div>
        </div>
      )}
    </dialog>
  )
}

/** 表单里的一行：标签 + 输入 */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="text-xs text-mute">{hint}</span>}
    </label>
  )
}
