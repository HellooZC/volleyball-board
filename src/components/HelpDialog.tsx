import { Modal } from './Modal'
import { Legend } from './SidePanel'

const ITEMS: [string, string][] = [
  ['主页', '左上角“主页”回到对局记录和队伍列表。每场对局、每支队伍都会自动保存。'],
  ['计分', '点“我方 +1”或“对方 +1”。接发球的一方得分（抢回发球权）就轮转一位：对方发球时我方得分，我方轮转；我方发球时对方得分，对方轮转。发球方不对时点“发球”切换。'],
  ['对方', '对方圆圈里的数字是开场顺序，小圆点是现在的位置。球场左上角“对方轮转 ‹ ›”可以对齐对方实际的轮转。'],
  ['局', '“新一局”会把这一局的比分存起来再归零；右边“记录”可以看每一局。'],
  ['阵型', '每支队每个轮转有两个阵型：接发球、我方发球（在主页“编辑阵型”摆）。对局里会照发球方自动摆出当前轮转的阵型；在对局里拖动也会改到队伍，下一场一样用。'],
  ['轮转', '1–6 选轮转。数字下两个点：左＝接发球、右＝我方发球，实心表示已经摆好。下面的 +/− 是本局在这个轮转的得失分。右边“一览”可以一次看 6 个轮转。'],
  ['摆站位', '直接拖动圆圈，放手就自动保存。拖错了点“撤销移动”，或“恢复默认”。'],
  ['换人', '点一下我方队员，旁边会弹出替补名单。'],
  ['画笔', '打开画笔后在球场上画跑位线，每个轮转的接发球 / 防守各自保存。'],
  ['快捷键', '1–6 切轮转 · R 接发球 / D 防守 · A 我方得分 · L 对方得分 · Z 撤销 · P 画笔 · V 全场 / 半场'],
]

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="使用说明" width="w-[min(560px,calc(100vw-32px))]">
      <dl className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-2 text-sm">
        {ITEMS.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-bold">{k}</dt>
            <dd className="m-0 text-mute">{v}</dd>
          </div>
        ))}
      </dl>
      <Legend />
      <button className="btn btn-primary self-end" onClick={onClose}>
        知道了
      </button>
    </Modal>
  )
}
