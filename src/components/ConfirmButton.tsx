import { useState, type ReactNode } from 'react'

/** 危险操作：点第一次变成“再点确认”，3 秒内再点才执行 */
export function ConfirmButton({
  label,
  confirm,
  onConfirm,
  className = 'btn',
  icon,
  ariaLabel,
}: {
  label?: string
  confirm: string
  onConfirm: () => void
  className?: string
  icon?: ReactNode
  ariaLabel?: string
}) {
  const [armed, setArmed] = useState(false)
  return (
    <button
      className={className + (armed ? ' border-lose text-lose' : '')}
      aria-label={armed ? confirm : ariaLabel}
      onClick={(e) => {
        e.stopPropagation()
        if (!armed) {
          setArmed(true)
          setTimeout(() => setArmed(false), 3000)
          return
        }
        setArmed(false)
        onConfirm()
      }}
    >
      {armed ? confirm : (icon ?? label)}
      {!armed && icon && label}
    </button>
  )
}
