import { go } from '../lib/router'

export function NotFound({ text }: { text: string }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-mute">{text}</p>
      <button className="btn btn-primary" onClick={go.home}>
        回到主页
      </button>
    </div>
  )
}
