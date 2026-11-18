import { useState } from 'react'
import { tplCount, uid, type Form, type Team, type Template } from '../lib/model'
import { store, useDB } from '../lib/store'
import { Field, Modal } from './Modal'

const fmtDate = (ms: number) => new Date(ms).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })

/** 导入队形：从任一队伍的模板套进当前对局 */
export function ImportDialog({
  open,
  onClose,
  preferTeamId,
  onImport,
}: {
  open: boolean
  onClose: () => void
  preferTeamId: string | null
  onImport: (tpl: Template) => void
}) {
  const { teams } = useDB()
  const sorted = [...teams].sort((a, b) => (a.id === preferTeamId ? -1 : b.id === preferTeamId ? 1 : 0))
  const [pick, setPick] = useState<Template | null>(null)

  return (
    <Modal open={open} onClose={onClose} title="导入队形">
      <p className="text-sm text-mute">选一套队形模板，6 个轮转的接发球 / 防守站位、画线和备注都会套进这场对局。</p>
      {sorted.map((team) => (
        <section key={team.id} className="flex flex-col gap-1.5">
          <h3 className="label">
            {team.name}
            {team.id === preferTeamId && ' · 本场队伍'}
          </h3>
          {team.templates.length === 0 && <p className="text-xs text-mute">这支队还没有模板。</p>}
          {team.templates.map((t) => (
            <button
              key={t.id}
              aria-pressed={pick?.id === t.id}
              onClick={() => setPick(t)}
              className="btn h-auto min-h-12 justify-between py-2 text-left"
            >
              <span className="font-bold">{t.name}</span>
              <span className="text-xs opacity-80">
                已摆 {tplCount(t.forms)}/12 · {fmtDate(t.updatedAt)}
              </span>
            </button>
          ))}
        </section>
      ))}
      <div className="sticky bottom-0 -mx-4 -mb-4 flex justify-end gap-2 border-t border-line bg-panel p-3">
        <button className="btn" onClick={onClose}>
          取消
        </button>
        <button
          className="btn btn-primary"
          disabled={!pick}
          onClick={() => {
            if (pick) onImport(pick)
            setPick(null)
            onClose()
          }}
        >
          导入（替换现在的队形）
        </button>
      </div>
    </Modal>
  )
}

/** 把当前对局的队形存成队伍模板（新建或覆盖） */
export function SaveTemplateDialog({
  open,
  onClose,
  preferTeamId,
  forms,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  preferTeamId: string | null
  forms: Record<string, Form>
  onSaved: (msg: string) => void
}) {
  const { teams } = useDB()
  const [teamId, setTeamId] = useState(preferTeamId ?? teams[0]?.id ?? '')
  const team: Team | undefined = teams.find((t) => t.id === teamId) ?? teams[0]
  const [target, setTarget] = useState<string>('new') // 'new' 或模板 id
  const [name, setName] = useState('')

  const save = () => {
    if (!team) return
    const tplName = target === 'new' ? name.trim() || `队形 ${team.templates.length + 1}` : ''
    store.updateTeam(team.id, (t) => {
      if (target === 'new') t.templates.push({ id: uid(), name: tplName, forms: structuredClone(forms), updatedAt: Date.now() })
      else {
        const tpl = t.templates.find((x) => x.id === target)
        if (tpl) {
          tpl.forms = structuredClone(forms)
          tpl.updatedAt = Date.now()
        }
      }
    })
    const shown = target === 'new' ? tplName : team.templates.find((x) => x.id === target)?.name
    onSaved(`已存到 ${team.name} ·「${shown}」`)
    setName('')
    setTarget('new')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="存为队形模板">
      <p className="text-sm text-mute">把这场对局现在的 6 个轮转站位（含画线和备注）存到队伍下，下次开对局可以直接用。</p>
      <Field label="存到哪支队">
        <select
          className="field"
          value={team?.id ?? ''}
          onChange={(e) => {
            setTeamId(e.target.value)
            setTarget('new')
          }}
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="label mb-1">存成</legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 has-checked:border-accent">
          <input type="radio" name="tpl" checked={target === 'new'} onChange={() => setTarget('new')} className="accent-(--accent)" />
          <span className="shrink-0">新模板</span>
          <input
            className="field min-h-9"
            placeholder={`队形 ${(team?.templates.length ?? 0) + 1}`}
            value={name}
            maxLength={20}
            onFocus={() => setTarget('new')}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {team?.templates.map((t) => (
          <label
            key={t.id}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 has-checked:border-accent"
          >
            <input type="radio" name="tpl" checked={target === t.id} onChange={() => setTarget(t.id)} className="accent-(--accent)" />
            <span>覆盖「{t.name}」</span>
            <span className="ml-auto text-xs text-mute">已摆 {tplCount(t.forms)}/12</span>
          </label>
        ))}
      </fieldset>
      <div className="flex justify-end gap-2">
        <button className="btn" onClick={onClose}>
          取消
        </button>
        <button className="btn btn-primary" onClick={save} disabled={!team}>
          保存
        </button>
      </div>
    </Modal>
  )
}
