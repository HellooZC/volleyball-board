import { useState } from 'react'
import { CLOUD_LABEL, cloudEnabled, useCloud, type CloudStatus } from '../lib/cloud'
import { Modal } from './Modal'

const DOT: Record<CloudStatus, string> = {
  off: 'bg-mute',
  loading: 'bg-mute animate-pulse',
  syncing: 'bg-accent animate-pulse',
  synced: 'bg-win',
  offline: 'bg-[var(--r-L)]',
  denied: 'bg-lose',
  error: 'bg-lose',
}

/** 主页右上角：云端同步状态（不用登录，打开就同步） */
export function CloudButton() {
  const cloud = useCloud()
  const [open, setOpen] = useState(false)
  if (!cloudEnabled) return null
  return (
    <>
      <button className="btn" onClick={() => setOpen(true)} aria-label={'云端同步：' + CLOUD_LABEL[cloud.status]}>
        <i className={'block size-2.5 rounded-full ' + DOT[cloud.status]} aria-hidden="true" />
        <span className="max-sm:hidden">{CLOUD_LABEL[cloud.status]}</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="云端同步" width="w-[min(420px,calc(100vw-32px))]">
        <div className="flex items-center gap-2 rounded-lg bg-bg p-3">
          <i className={'block size-3 shrink-0 rounded-full ' + DOT[cloud.status]} aria-hidden="true" />
          <p className="font-bold">{CLOUD_LABEL[cloud.status]}</p>
        </div>
        {cloud.message && <p className="text-sm text-lose">{cloud.message}</p>}
        <p className="text-xs text-mute">
          打开网站就会自动同步，所有设备看到同一份队伍、阵型和对局。每次改动先存在这台设备，再送到云端；没网络时会排队，连上网后自动补送。两个人同时改同一场对局时，以最后改的为准。
        </p>
        <button className="btn btn-primary self-end" onClick={() => setOpen(false)}>
          好
        </button>
      </Modal>
    </>
  )
}
