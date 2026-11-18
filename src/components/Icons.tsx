const PATHS = {
  undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  back: 'M15 18l-6-6 6-6',
  home: 'M3 11l9-8 9 8M5 9.5V21h14V9.5',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  team: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8',
  import: 'M12 3v12M7 10l5 5 5-5M4 19h16',
  save: 'M5 3h11l3 3v15H5zM8 3v5h7V3M8 21v-7h8v7',
  reset: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  pen: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  plus: 'M12 5v14M5 12h14',
  close: 'M18 6 6 18M6 6l12 12',
  download: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  upload: 'M12 21V9M7 14l5-5 5 5M5 3h14',
  panel: 'M4 6h16M4 12h16M4 18h10',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  shrink: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, className = 'size-4' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}

export function Ball({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="-16 -16 32 32" className={className} aria-hidden="true">
      <clipPath id="ball-ic">
        <circle r="14" />
      </clipPath>
      <circle r="14" fill="#fbf8ef" />
      <g clipPath="url(#ball-ic)">
        <path d="M-15 -15L15 -15L15 -3C8 -10 -8 -10 -15 -3Z" fill="#2f6fc5" />
        <path d="M-15 15L15 15L15 3C8 -3 -8 -3 -15 3Z" fill="#f1c40f" />
      </g>
      <circle r="14" fill="none" stroke="#6b6558" strokeWidth="2.5" />
    </svg>
  )
}
