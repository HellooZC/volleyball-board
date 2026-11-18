import { useState } from 'react'
import { authErrorText, CLOUD_LABEL, cloudEnabled, resetPassword, signIn, signOutCloud, useCloud, type CloudStatus } from '../lib/cloud'
import { Icon } from './Icons'
import { Field, Modal } from './Modal'

const DOT: Record<CloudStatus, string> = {
  off: 'bg-mute',
  loading: 'bg-mute animate-pulse',
  'signed-out': 'bg-mute',
  syncing: 'bg-accent animate-pulse',
  synced: 'bg-win',
  offline: 'bg-[var(--r-L)]',
  denied: 'bg-lose',
  error: 'bg-lose',
}

/** 主页右上角：未登录显示“登录同步”，已登录显示同步状态 */
export function CloudButton() {
  const cloud = useCloud()
  const [open, setOpen] = useState(false)
  if (!cloudEnabled) return null
  const signedIn = !!cloud.email
  return (
    <>
      <button className={'btn ' + (signedIn ? '' : 'btn-primary')} onClick={() => setOpen(true)}>
        {signedIn ? (
          <>
            <i className={'block size-2.5 rounded-full ' + DOT[cloud.status]} aria-hidden="true" />
            <span className="max-sm:hidden">{CLOUD_LABEL[cloud.status]}</span>
            <span className="sr-only sm:hidden">{CLOUD_LABEL[cloud.status]}</span>
          </>
        ) : (
          <>
            <Icon name="upload" />
            {cloud.status === 'loading' ? '连接中…' : '登录同步'}
          </>
        )}
      </button>
      {signedIn ? <AccountDialog open={open} onClose={() => setOpen(false)} /> : <LoginDialog open={open} onClose={() => setOpen(false)} />}
    </>
  )
}

function LoginDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [email, setEmail] = useState('')

  return (
    <Modal open={open} onClose={onClose} title="登录同步" width="w-[min(420px,calc(100vw-32px))]">
      <p className="text-sm text-mute">登录后，队伍、队形和对局会存到云端，教练团的每台设备看到同一份。账号由管理员在 Firebase 里建立。</p>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault()
          const pw = String(new FormData(e.currentTarget).get('pw') ?? '')
          setBusy(true)
          setMsg(null)
          try {
            await signIn(email, pw)
            onClose()
          } catch (err) {
            setMsg({ ok: false, text: authErrorText(err) })
          } finally {
            setBusy(false)
          }
        }}
      >
        <Field label="邮箱">
          <input
            className="field"
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="密码">
          <input name="pw" className="field" type="password" autoComplete="current-password" required />
        </Field>
        {msg && (
          <p role="alert" className={'text-sm ' + (msg.ok ? 'text-win' : 'text-lose')}>
            {msg.text}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="cursor-pointer text-sm text-accent underline-offset-2 hover:underline"
            onClick={async () => {
              if (!email) return setMsg({ ok: false, text: '先填邮箱，再点“忘记密码”' })
              try {
                await resetPassword(email)
                setMsg({ ok: true, text: '如果这个邮箱有账号，重设密码的邮件已经寄出' })
              } catch (err) {
                setMsg({ ok: false, text: authErrorText(err) })
              }
            }}
          >
            忘记密码
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? '登录中…' : '登录'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function AccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cloud = useCloud()
  return (
    <Modal open={open} onClose={onClose} title="云端同步" width="w-[min(420px,calc(100vw-32px))]">
      <div className="flex items-center gap-2 rounded-lg bg-bg p-3">
        <i className={'block size-3 shrink-0 rounded-full ' + DOT[cloud.status]} aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-bold">{CLOUD_LABEL[cloud.status]}</p>
          <p className="truncate text-xs text-mute">{cloud.email}</p>
        </div>
      </div>
      {cloud.message && <p className="text-sm text-lose">{cloud.message}</p>}
      <p className="text-xs text-mute">
        每次改动都会先存在这台设备，再自动送到云端；没网络时会排队，连上网后自动补送。两个人同时改同一场对局时，以最后改的为准。
      </p>
      <div className="flex justify-end gap-2">
        <button
          className="btn"
          onClick={() => {
            void signOutCloud()
            onClose()
          }}
        >
          登出
        </button>
        <button className="btn btn-primary" onClick={onClose}>
          好
        </button>
      </div>
    </Modal>
  )
}
