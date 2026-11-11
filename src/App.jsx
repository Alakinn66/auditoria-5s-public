import { useEffect, useMemo, useState } from 'react'
import {
  CRITERIA, FOOTER, PHASES, SCORE_HINTS, SUBAREAS, SUPERVISORS,
  phaseAverages, totalAverage,
} from './data/catalog.js'
import { PIN, SUPABASE_CONFIGURED } from './supabaseClient.js'
import {
  compressImage, deleteAudit, downloadPdf, exportCsv,
  loadAuditDetail, loadAudits, saveAudit,
} from './lib/store.js'

const DRAFT_KEY = 'auditoria5s_draft'

function emptyDraft() {
  return {
    area: '', subArea: '', auditor: '', supervisor: '',
    items: CRITERIA.map(() => ({ score: null, comment: '', photos: [] })),
  }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    if (!d.items || d.items.length !== 20) return null
    return { ...emptyDraft(), ...d, items: d.items.map((it) => ({ score: it.score ?? null, comment: it.comment || '', photos: [] })) }
  } catch { return null }
}

function Footer() {
  return (
    <footer className="footer">
      <b>{FOOTER.line1}</b><br />
      {FOOTER.line2}<br />
      {FOOTER.line3}
    </footer>
  )
}

function ScoreButtons({ value, onChange }) {
  return (
    <div>
      <div className="score-grid">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <div className="score-col" key={n}>
            <button
              type="button"
              className={`score-btn${value === n ? ' selected' : ''}`}
              onClick={() => onChange(n)}
              aria-label={`${n} - ${SCORE_HINTS[n]}`}
            >{n}</button>
            <span className="score-hint">{SCORE_HINTS[n]}</span>
          </div>
        ))}
      </div>
      <div className="legend"><span>0 - Deficiente</span><span>5 - Excelente</span></div>
    </div>
  )
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => !PIN || sessionStorage.getItem('a5s_unlocked') === '1')
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [screen, setScreen] = useState('home')
  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState(() => loadDraft())
  const [qIndex, setQIndex] = useState(0)
  const [detail, setDetail] = useState(null)
  const [filterArea, setFilterArea] = useState('')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)

  const refreshAudits = async () => {
    setLoading(true)
    setError('')
    try { setAudits(await loadAudits()) } catch (e) { setError(e.message || 'No se pudieron cargar las auditorías.') }
    setLoading(false)
  }

  useEffect(() => { if (unlocked) refreshAudits() }, [unlocked])

  // Borrador retomable (sin fotos: se guardan solo en la sesión).
  useEffect(() => {
    if (!draft) return
    const { items, ...rest } = draft
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...rest, items: items.map((it) => ({ score: it.score, comment: it.comment })) }))
    } catch { /* almacenamiento lleno: el borrador vive solo en la sesión */ }
  }, [draft])

  const stats = useMemo(() => {
    if (!audits.length) return { total: 0, avg: null, perArea: [] }
    const avg = audits.reduce((a, b) => a + Number(b.average), 0) / audits.length
    const map = {}
    audits.forEach((a) => { map[a.area] = (map[a.area] || 0) + 1 })
    return { total: audits.length, avg, perArea: Object.entries(map).sort((x, y) => y[1] - x[1]) }
  }, [audits])

  const filteredAudits = useMemo(
    () => (filterArea ? audits.filter((a) => a.area === filterArea) : audits),
    [audits, filterArea],
  )

  const areas = useMemo(() => [...new Set(audits.map((a) => a.area))].sort(), [audits])

  function startNew() {
    setDraft(emptyDraft())
    setQIndex(0)
    setScreen('setup')
  }

  function resumeDraft() {
    setQIndex(0)
    setScreen('setup')
  }

  function setItem(i, patch) {
    setDraft((d) => ({ ...d, items: d.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }))
  }

  async function handleSave() {
    if (!draft) return
    setSaving(true)
    setError('')
    try {
      const id = await saveAudit(draft)
      localStorage.removeItem(DRAFT_KEY)
      setDraft(null)
      await refreshAudits()
      const d = await loadAuditDetail(id)
      setDetail(d)
      setScreen('detail')
    } catch (e) {
      setError(e.message || 'No se pudo guardar la auditoría. Revisa tu conexión e inténtalo de nuevo.')
    }
    setSaving(false)
  }

  async function openDetail(audit) {
    setBusy(true)
    setError('')
    try { setDetail(await loadAuditDetail(audit.id)); setScreen('detail') } catch (e) { setError(e.message || 'No se pudo abrir la auditoría.') }
    setBusy(false)
  }

  async function handleDelete(auditId) {
    if (!window.confirm('¿Eliminar esta auditoría? Esta acción no se puede deshacer.')) return
    setBusy(true)
    try { await deleteAudit(auditId); setDetail(null); await refreshAudits(); setScreen('history') } catch (e) { setError(e.message || 'No se pudo eliminar.') }
    setBusy(false)
  }

  async function addPhoto(i, file) {
    if (!file) return
    try {
      const dataUrl = await compressImage(file)
      setDraft((d) => {
        const photos = d.items[i].photos || []
        if (photos.length >= 3) return d
        return { ...d, items: d.items.map((it, j) => (j === i ? { ...it, photos: [...photos, dataUrl] } : it)) }
      })
    } catch { setError('No se pudo procesar la foto. Intenta con otra imagen.') }
  }

  // ---- PIN gate ----
  if (!unlocked) {
    return (
      <div className="app">
        <div className="content">
          <div className="pin-box">
            <h1>AUDITORÍA 5S</h1>
            <p className="muted">Ingresa el código de acceso para entrar a la app.</p>
            <input
              type="password" inputMode="numeric" value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitPin() }}
              placeholder="••••"
              autoFocus
            />
            {pinError && <div className="error">{pinError}</div>}
            <button className="btn btn-red" onClick={submitPin}>Entrar</button>
            <p className="small">El código lo define quien administra la app. Si no lo tienes, pídelo al responsable de Mejora Continua.</p>
          </div>
        </div>
        <Footer />
      </div>
    )
    function submitPin() {
      if (pinInput === PIN) {
        sessionStorage.setItem('a5s_unlocked', '1')
        setUnlocked(true)
      } else {
        setPinError('Código incorrecto. Inténtalo de nuevo.')
      }
    }
  }

  const draftScores = draft ? draft.items.map((it) => it.score) : []
  const draftAvg = draft ? totalAverage(draftScores) : null
  const draftPhases = draft ? phaseAverages(draftScores) : []

  return (
    <div className="app">
      <div className="content">
        {!SUPABASE_CONFIGURED && (
          <div className="banner">
            <b>Modo local:</b> Supabase no está configurado, así que las auditorías se
            guardan solo en este navegador y no se comparten. Configura las variables
            VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (ver README) para compartir datos.
          </div>
        )}
        {error && <div className="error">{error}</div>}

        {screen === 'home' && (
          <div>
            <h1>AUDITORÍA 5S</h1>
            <p className="muted">Production Area Audit</p>
            <div className="stat-grid">
              <div className="stat"><b>{stats.total}</b><span>Auditorías</span></div>
              <div className="stat"><b>{stats.avg === null ? '—' : stats.avg.toFixed(2)}</b><span>Promedio general</span></div>
              <div className="stat"><b>{stats.perArea.length}</b><span>Áreas auditadas</span></div>
            </div>
            <button className="btn btn-red" onClick={startNew}>NUEVA AUDITORÍA</button>
            <div style={{ height: 10 }} />
            <button className="btn btn-black" onClick={() => setScreen('history')}>HISTORIAL</button>
            {draft && (
              <div className="card">
                <b>Borrador en curso</b>
                <p className="muted">{draft.subArea || 'Sin subárea'} — {draft.items.filter((it) => it.score !== null).length}/20 criterios calificados</p>
                <button className="btn btn-ghost" onClick={resumeDraft}>Retomar borrador</button>
              </div>
            )}
            <h2>LAS 5 S</h2>
            {PHASES.map((p, i) => (
              <div className="card" key={p.key}>
                <b>{p.name}</b>
                <p className="muted">{CRITERIA.filter((c) => c.phase === i).map((c) => c.title).join(' · ')}</p>
              </div>
            ))}
            {stats.perArea.length > 0 && (
              <div>
                <h2>Auditorías por área</h2>
                {stats.perArea.map(([area, n]) => (
                  <div className="row space-between" key={area} style={{ padding: '6px 0', borderBottom: '1px solid #f4f4f5' }}>
                    <span>{area}</span><b>{n}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {screen === 'setup' && draft && (
          <div>
            <h1>Nueva auditoría</h1>
            <p className="muted">Datos de la auditoría</p>
            <div className="field">
              <label>Subárea</label>
              <select
                value={draft.subArea}
                onChange={(e) => {
                  const found = SUBAREAS.find((s) => s.sub === e.target.value)
                  setDraft({ ...draft, subArea: e.target.value, area: found ? found.area : '' })
                }}
              >
                <option value="">Selecciona una subárea…</option>
                {SUBAREAS.map((s) => (
                  <option key={s.sub} value={s.sub}>{s.sub}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Área (se llena sola según la subárea)</label>
              <input value={draft.area} readOnly placeholder="—" />
            </div>
            <div className="field">
              <label>Auditor</label>
              <input
                value={draft.auditor}
                onChange={(e) => setDraft({ ...draft, auditor: e.target.value })}
                placeholder="Nombre de quien audita"
              />
            </div>
            <div className="field">
              <label>Supervisor</label>
              <select value={draft.supervisor} onChange={(e) => setDraft({ ...draft, supervisor: e.target.value })}>
                <option value="">Selecciona un supervisor…</option>
                {SUPERVISORS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button
              className="btn btn-red"
              disabled={!draft.subArea || !draft.auditor || !draft.supervisor}
              onClick={() => { setQIndex(0); setScreen('question') }}
            >Comenzar cuestionario</button>
            <div style={{ height: 10 }} />
            <button className="btn btn-ghost" onClick={() => setScreen('home')}>Volver al inicio</button>
          </div>
        )}

        {screen === 'question' && draft && (
          <div>
            <div className="row space-between">
              <span className="phase-tag">{PHASES[CRITERIA[qIndex].phase].name}</span>
              <span className="muted">{qIndex + 1} de 20</span>
            </div>
            <div className="progress"><div style={{ width: `${((qIndex + 1) / 20) * 100}%` }} /></div>
            <h2>{CRITERIA[qIndex].title}</h2>
            <p className="criterion-desc">{CRITERIA[qIndex].description}</p>
            <ScoreButtons value={draft.items[qIndex].score} onChange={(n) => setItem(qIndex, { score: n })} />
            <div className="field">
              <label>Comentario (opcional)</label>
              <textarea
                rows={3}
                value={draft.items[qIndex].comment}
                onChange={(e) => setItem(qIndex, { comment: e.target.value })}
                placeholder="Observaciones o hallazgos de este criterio…"
              />
            </div>
            <div className="field">
              <label>Evidencia fotográfica (hasta 3 fotos)</label>
              <div className="photo-grid">
                {(draft.items[qIndex].photos || []).map((src, i) => (
                  <div className="photo-thumb" key={i}>
                    <img src={src} alt={`Evidencia ${i + 1}`} />
                    <button type="button" onClick={() => setItem(qIndex, { photos: draft.items[qIndex].photos.filter((_, j) => j !== i) })}>×</button>
                  </div>
                ))}
                {(draft.items[qIndex].photos || []).length < 3 && (
                  <label className="add-photo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    +
                    <input
                      type="file" accept="image/*" capture="environment"
                      style={{ display: 'none' }}
                      onChange={(e) => { addPhoto(qIndex, e.target.files[0]); e.target.value = '' }}
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="row" style={{ marginTop: 18 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} disabled={qIndex === 0} onClick={() => setQIndex(qIndex - 1)}>← Anterior</button>
              {qIndex < 19 ? (
                <button className="btn btn-black" style={{ flex: 1 }} onClick={() => setQIndex(qIndex + 1)}>Siguiente →</button>
              ) : (
                <button className="btn btn-red" style={{ flex: 1 }} onClick={() => setScreen('summary')}>Ver resumen</button>
              )}
            </div>
            <div style={{ height: 10 }} />
            <button className="btn btn-ghost" onClick={() => setScreen('home')}>Guardar como borrador y salir</button>
          </div>
        )}

        {screen === 'summary' && draft && (
          <div>
            <h1>Resumen</h1>
            <p className="muted">{draft.subArea} · {draft.area} · {draft.auditor} · {draft.supervisor}</p>
            <div className="score-panel">
              <div className="big">{draftAvg === null ? '—' : draftAvg.toFixed(2)} / 5</div>
              <div className="sub">{draftAvg === null ? 'Sin calificaciones' : `${Math.round(draftAvg * 20)} puntos de 100`}</div>
            </div>
            <table className="phase-table"><tbody>
              {PHASES.map((p, i) => (
                <tr key={p.key}><td>{p.name}</td><td>{draftPhases[i] === null ? '—' : draftPhases[i].toFixed(2)}</td></tr>
              ))}
            </tbody></table>
            <p className="muted">{draft.items.filter((it) => it.score !== null).length}/20 criterios calificados · {draft.items.reduce((a, it) => a + (it.photos || []).length, 0)} fotos</p>
            {draft.items.some((it) => it.score === null) && (
              <div className="banner">Hay criterios sin calificar. Puedes volver y completarlos, o guardar así y quedarán fuera del promedio.</div>
            )}
            <button className="btn btn-red" disabled={saving} onClick={handleSave}>{saving ? 'Guardando…' : 'Guardar auditoría'}</button>
            <div style={{ height: 10 }} />
            <button className="btn btn-ghost" onClick={() => setScreen('question')}>Volver al cuestionario</button>
          </div>
        )}

        {screen === 'history' && (
          <div>
            <h1>Historial</h1>
            <div className="field">
              <label>Filtrar por área</label>
              <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)}>
                <option value="">Todas las áreas</option>
                {areas.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="row">
              <button className="btn btn-black" style={{ flex: 1 }} disabled={busy || !filteredAudits.length} onClick={() => exportCsv(filteredAudits)}>Descargar Excel (CSV)</button>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setScreen('home')}>Inicio</button>
            </div>
            {loading ? <p className="muted">Cargando…</p> : filteredAudits.length === 0 ? (
              <p className="muted">Aún no hay auditorías registradas.</p>
            ) : filteredAudits.map((a) => (
              <div className="card" key={a.id} onClick={() => openDetail(a)} style={{ cursor: 'pointer' }}>
                <div className="row space-between">
                  <b>{a.sub_area}</b>
                  <b>{Number(a.average).toFixed(2)} / 5</b>
                </div>
                <p className="muted">{a.area} · {new Date(a.created_at).toLocaleDateString('es-MX')} · {a.auditor} · Sup. {a.supervisor}</p>
              </div>
            ))}
          </div>
        )}

        {screen === 'detail' && detail && (
          <div>
            <h1>{detail.sub_area}</h1>
            <p className="muted">{detail.area} · {new Date(detail.created_at).toLocaleString('es-MX')}</p>
            <p className="muted">Auditor: {detail.auditor} · Supervisor: {detail.supervisor}</p>
            <div className="score-panel">
              <div className="big">{Number(detail.average).toFixed(2)} / 5</div>
              <div className="sub">{detail.total_score} puntos de 100</div>
            </div>
            <table className="phase-table"><tbody>
              {PHASES.map((p, i) => {
                const phases = phaseAverages(detail.items.map((it) => it.score))
                return <tr key={p.key}><td>{p.name}</td><td>{phases[i] === null ? '—' : phases[i].toFixed(2)}</td></tr>
              })}
            </tbody></table>
            {detail.items.map((it, i) => (
              <div className="card" key={i}>
                <div className="row space-between">
                  <b>{i + 1}. {CRITERIA[i].title}</b>
                  <b>{it.score} / 5</b>
                </div>
                {it.comment && <p className="muted">{it.comment}</p>}
                {(it.photos || []).length > 0 && (
                  <div className="photo-grid">
                    {it.photos.map((src, j) => (
                      <a className="photo-thumb" key={j} href={src} target="_blank" rel="noreferrer">
                        <img src={src} alt={`Evidencia ${j + 1}`} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button className="btn btn-black" disabled={busy} onClick={async () => { setBusy(true); try { await downloadPdf(detail) } catch (e) { setError('No se pudo generar el PDF.') } setBusy(false) }}>
              {busy ? 'Generando PDF…' : 'Descargar PDF'}
            </button>
            <div style={{ height: 10 }} />
            <div className="row">
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setScreen('history')}>Historial</button>
              <button className="btn btn-danger" style={{ flex: 1 }} disabled={busy} onClick={() => handleDelete(detail.id)}>Eliminar</button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
