import { jsPDF } from 'jspdf'
import { supabase, SUPABASE_CONFIGURED } from '../supabaseClient.js'
import { CRITERIA, PHASES, phaseAverages, totalAverage } from '../data/catalog.js'

// ---------------------------------------------------------------------------
// Capa de datos: Supabase cuando está configurado, localStorage como
// respaldo (modo local, solo en este navegador). Las fotos en modo local
// se guardan como data URL dentro del registro.
// ---------------------------------------------------------------------------

const LOCAL_KEY = 'auditoria5s_local_audits'

function localAudits() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') } catch { return [] }
}
function saveLocalAudits(list) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list))
}

export async function loadAudits() {
  if (!SUPABASE_CONFIGURED) return localAudits()
  const { data, error } = await supabase
    .from('audits')
    .select('id, created_at, area, sub_area, auditor, supervisor, average, total_score')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function loadAuditDetail(auditId) {
  if (!SUPABASE_CONFIGURED) {
    const found = localAudits().find((a) => a.id === auditId)
    if (!found) throw new Error('Auditoría no encontrada')
    return found
  }
  const [itemsRes, photosRes] = await Promise.all([
    supabase.from('audit_items').select('*').eq('audit_id', auditId).order('criterion_index'),
    supabase.from('audit_photos').select('*').eq('audit_id', auditId).order('criterion_index'),
  ])
  if (itemsRes.error) throw itemsRes.error
  if (photosRes.error) throw photosRes.error
  const { data: audit, error } = await supabase.from('audits').select('*').eq('id', auditId).single()
  if (error) throw error
  return {
    ...audit,
    items: itemsRes.data.map((it) => ({
      score: it.score,
      comment: it.comment,
      photos: photosRes.data.filter((p) => p.criterion_index === it.criterion_index).map((p) => p.url),
    })),
  }
}

export async function deleteAudit(auditId) {
  if (!SUPABASE_CONFIGURED) {
    saveLocalAudits(localAudits().filter((a) => a.id !== auditId))
    return
  }
  // Borra las fotos del bucket y luego la auditoría (los items y las
  // filas de fotos se borran en cascada).
  const { data: files } = await supabase.storage.from('evidencias').list(auditId)
  if (files && files.length) {
    await supabase.storage.from('evidencias').remove(files.map((f) => `${auditId}/${f.name}`))
  }
  const { error } = await supabase.from('audits').delete().eq('id', auditId)
  if (error) throw error
}

// Comprime una imagen a JPEG (máx. 1024 px) y la devuelve como data URL.
export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = () => { img.src = reader.result }
    reader.onerror = reject
    img.onload = () => {
      const max = 1024
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = reject
    reader.readAsDataURL(file)
  })
}

function dataUrlToBlob(dataUrl) {
  const [meta, base64] = dataUrl.split(',')
  const mime = meta.match(/data:(.*?);/)[1]
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export async function saveAudit(draft) {
  const scores = draft.items.map((it) => it.score)
  const average = totalAverage(scores)
  const total = Math.round(average * 20)
  const meta = {
    area: draft.area,
    sub_area: draft.subArea,
    auditor: draft.auditor,
    supervisor: draft.supervisor,
    average: Number(average.toFixed(2)),
    total_score: total,
  }

  if (!SUPABASE_CONFIGURED) {
    const audit = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...meta,
      items: draft.items.map((it) => ({
        score: it.score,
        comment: it.comment || '',
        photos: it.photos || [],
      })),
    }
    saveLocalAudits([audit, ...localAudits()])
    return audit.id
  }

  const { data: auditRow, error } = await supabase.from('audits').insert(meta).select('id').single()
  if (error) throw error
  const auditId = auditRow.id

  const { error: itemsError } = await supabase.from('audit_items').insert(
    draft.items.map((it, i) => ({
      audit_id: auditId,
      s_index: CRITERIA[i].phase,
      criterion_index: i,
      criterion_title: CRITERIA[i].title,
      score: it.score,
      comment: it.comment || '',
    })),
  )
  if (itemsError) throw itemsError

  // Fotos: subir al bucket "evidencias" y guardar su URL pública.
  const photoRows = []
  for (let i = 0; i < draft.items.length; i++) {
    const photos = draft.items[i].photos || []
    for (let j = 0; j < photos.length; j++) {
      const path = `${auditId}/${i}_${j}.jpg`
      const { error: upError } = await supabase.storage
        .from('evidencias')
        .upload(path, dataUrlToBlob(photos[j]), { contentType: 'image/jpeg', upsert: true })
      if (upError) throw upError
      const { data: pub } = supabase.storage.from('evidencias').getPublicUrl(path)
      photoRows.push({ audit_id: auditId, criterion_index: i, url: pub.publicUrl, storage_path: path })
    }
  }
  if (photoRows.length) {
    const { error: photoError } = await supabase.from('audit_photos').insert(photoRows)
    if (photoError) throw photoError
  }
  return auditId
}

// ---------------------------------------------------------------------------
// Exportar Excel (CSV con BOM UTF-8 para que Excel muestre los acentos)
// ---------------------------------------------------------------------------

function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v)
  return `"${s.replace(/"/g, '""')}"`
}

export async function exportCsv(audits) {
  const header = ['Fecha', 'Área', 'Subárea', 'Auditor', 'Supervisor', 'Calificación general (/5)', 'Puntos (de 100)', '1S Seleccionar', '2S Ordenar', '3S Limpiar', '4S Estandarizar', '5S Sostener']
  const rows = [header]
  for (const a of audits) {
    let phases = [null, null, null, null, null]
    try {
      const detail = await loadAuditDetail(a.id)
      phases = phaseAverages(detail.items.map((it) => it.score))
    } catch { /* si falla el detalle, se exporta el resumen */ }
    rows.push([
      new Date(a.created_at).toLocaleDateString('es-MX'),
      a.area, a.sub_area, a.auditor, a.supervisor,
      Number(a.average).toFixed(2), a.total_score,
      ...phases.map((p) => (p === null ? '' : p.toFixed(2))),
    ])
  }
  const csv = '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `resumen_auditorias_5S_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Descargar PDF de una auditoría (jsPDF)
// ---------------------------------------------------------------------------

async function urlToDataUrl(url) {
  try {
    const res = await fetch(url, { mode: 'cors' })
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

export async function downloadPdf(detail) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = 595
  const M = 48
  let y = 56

  const line = (text, size = 11, bold = false, gap = 16) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(text, W - M * 2)
    for (const l of lines) {
      if (y > 780) { doc.addPage(); y = 56 }
      doc.text(l, M, y)
      y += gap
    }
  }

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
  doc.text('AUDITORÍA 5S', M, y); y += 20
  doc.setFontSize(11)
  doc.text('DANFOSS - HEX  |  MEJORA CONTINUA', M, y); y += 26

  line(`Fecha: ${new Date(detail.created_at).toLocaleString('es-MX')}`, 11, true, 16)
  line(`Área: ${detail.area}`, 11, false, 16)
  line(`Subárea: ${detail.sub_area}`, 11, false, 16)
  line(`Auditor: ${detail.auditor}`, 11, false, 16)
  line(`Supervisor: ${detail.supervisor}`, 11, false, 16)
  y += 8
  line(`Calificación general: ${Number(detail.average).toFixed(2)} / 5   (${detail.total_score} puntos de 100)`, 12, true, 18)
  y += 6
  const phases = phaseAverages(detail.items.map((it) => it.score))
  PHASES.forEach((p, i) => {
    line(`${p.name}: ${phases[i] === null ? '—' : phases[i].toFixed(2)}`, 11, false, 15)
  })
  y += 10

  for (let i = 0; i < CRITERIA.length; i++) {
    const c = CRITERIA[i]
    const it = detail.items[i] || { score: null, comment: '', photos: [] }
    if (y > 740) { doc.addPage(); y = 56 }
    line(`${i + 1}. ${c.title} — ${it.score === null ? '—' : it.score + ' / 5'}`, 11, true, 15)
    line(c.description, 10, false, 14)
    if (it.comment) line(`Comentario: ${it.comment}`, 10, false, 14)
    const photos = it.photos || []
    for (const url of photos.slice(0, 3)) {
      const dataUrl = url.startsWith('data:') ? url : await urlToDataUrl(url)
      if (!dataUrl) { line(`Foto: ${url}`, 9, false, 13); continue }
      try {
        if (y > 640) { doc.addPage(); y = 56 }
        doc.addImage(dataUrl, 'JPEG', M, y, 180, 120)
        y += 132
      } catch { line(`Foto: ${url}`, 9, false, 13) }
    }
    y += 6
  }

  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.setTextColor(140)
    doc.text('DANFOSS - HEX  |  MEJORA CONTINUA  |  Versión: 1.0 - Actualizado Nov 2026', M, 820)
    doc.text(`Página ${p} de ${pages}`, W - M, 820, { align: 'right' })
    doc.setTextColor(0)
  }

  const safe = `${detail.area}-${detail.sub_area}`.replace(/[^\w\-]+/g, '_')
  doc.save(`auditoria_5S_${safe}_${new Date(detail.created_at).toISOString().slice(0, 10)}.pdf`)
}
