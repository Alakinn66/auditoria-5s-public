// Catálogos de la app Auditoría 5S (Danfoss - HEX, Mejora Continua).
// Para cambiar áreas, subáreas o supervisores edita este archivo y vuelve a
// desplegar. Las auditorías ya guardadas no cambian (guardan el texto).

export const FOOTER = {
  line1: 'DANFOSS - HEX',
  line2: 'MEJORA CONTINUA',
  line3: 'Versión: 1.0 - Actualizado Nov 2026',
}

// Área general -> subáreas. El selector muestra la Subárea y el Área
// general se llena sola.
export const AREA_SUBAREAS = {
  Ensamble: ['M1009 & M1015', 'M1014 & M1018', 'M1020 & M1016', 'Soldadura Manifold', 'Área de rollos'],
  Horno: ['Entrada / WIP', 'Soldadura & Flux', 'Salida'],
  Dobladora: ['M1090 & M1091 + Thermofit'],
  Empaque: ['Rack empaque & Tarimas', 'Unión & Empaque + WIP'],
  Helio: ['M1075 & M1300'],
  Soldadura: ['Vertical manual & autobrazing'],
  Calidad: ['Retrabajo'],
  Mantenimiento: ['Taller Mantenimiento'],
  Manufactura: ['Taller Manufactura'],
  Supermercado: ['Supermercado'],
}

// Lista plana de subáreas con su área general (para el selector).
export const SUBAREAS = Object.entries(AREA_SUBAREAS).flatMap(([area, subs]) =>
  subs.map((sub) => ({ area, sub })),
)

export const SUPERVISORS = [
  'Luis Zamora',
  'Francisco Alarcón',
  'Javier Guillen',
  'Carlos Cabrera',
  'Jesus Espinosa',
  'Jahir Sanchez',
  'Adalberto Orozco',
  'Ricardo Castrejón',
  'Antonio Azúa',
  'Jan Gonzalez',
]

// Guía de hallazgos bajo cada botón de calificación.
export const SCORE_HINTS = {
  0: '+5 de hallazgos',
  1: '3 o 4 hallazgos',
  2: '1 o 2 hallazgos',
  3: '0 hallazgos',
  4: 'Sostenido +1 mes',
  5: 'Sostenido +3 meses',
}

export const PHASES = [
  { key: '1S', name: '1S Seleccionar', short: '1S', label: 'SELECCIONAR', color: '#1e3a5f', desc: 'Solo lo necesario.' },
  { key: '2S', name: '2S Ordenar', short: '2S', label: 'ORDENAR', color: '#b91c1c', desc: 'Cada cosa en su lugar.' },
  { key: '3S', name: '3S Limpiar', short: '3S', label: 'LIMPIAR', color: '#15803d', desc: 'Limpio y ordenado.' },
  { key: '4S', name: '4S Estandarizar', short: '4S', label: 'ESTANDARIZAR', color: '#d97706', desc: 'Mantener y mejorar.' },
  { key: '5S', name: '5S Sostener', short: '5S', label: 'SOSTENER', color: '#6b7280', desc: 'Disciplina y asegurar que se mantenga.' },
]

// Color de cada calificación, igual que en la app original:
// 0 vino, 1 rojo, 2 naranja, 3 amarillo, 4 verde, 5 azul.
export const SCORE_COLORS = {
  0: '#7f1d1d',
  1: '#dc2626',
  2: '#ea580c',
  3: '#eab308',
  4: '#16a34a',
  5: '#1d4ed8',
}

// 20 criterios exactos, en orden. phase: 0..4 (1S..5S).
export const CRITERIA = [
  // 1S Seleccionar
  { phase: 0, title: 'Objetos innecesarios', description: 'No existen objetos innecesarios, dañados o fuera de uso en los pasillos, estanterías y áreas de trabajo; solo permanece lo necesario para las operaciones de producción.' },
  { phase: 0, title: 'Máquinas, gabinetes y muebles', description: 'Únicamente están las máquinas, gabinetes y muebles requeridos para la operación actual; no hay equipos en desuso.' },
  { phase: 0, title: 'Herramientas, fixtures & otros equipos', description: 'Solo están las herramientas, fixtures y equipos necesarios. Los innecesarios se han retirado o etiquetado.' },
  { phase: 0, title: 'Kanban & inventarios', description: 'Los inventarios están controlados por Kanban; no hay excesos ni materiales obsoletos.' },
  { phase: 0, title: 'Anuncios & boletines', description: 'Solo hay anuncios vigentes y relevantes; los desactualizados han sido retirados. No hay nada pegado en paredes ni ventanas con masking tape.' },
  // 2S Ordenar
  { phase: 1, title: 'Layout del área', description: 'El layout y flujo del área facilita el trabajo y optimiza movimientos, operación y desplazamientos.' },
  { phase: 1, title: 'Lugar específico para herramientas / fixtures', description: 'Cada herramienta y fixture tiene un lugar definido y señalizado, y está en su lugar después de su uso.' },
  { phase: 1, title: 'Materiales', description: 'Los materiales están ordenados por tipo, color y tamaño, con espacios definidos y respetados.' },
  { phase: 1, title: 'Residuos peligrosos', description: 'Los residuos peligrosos se encuentran organizados, etiquetados y almacenados adecuadamente.' },
  { phase: 1, title: 'Documentación & ayudas visuales', description: 'La documentación y ayudas visuales están organizadas, actualizadas y colocadas correctamente.' },
  // 3S Limpiar
  { phase: 2, title: 'Condición de pisos', description: 'Los pisos, paredes y techos están limpios, sin residuos ni manchas.' },
  { phase: 2, title: 'Máquinas & equipos', description: 'Las máquinas están limpias, en buen estado y con óptimo funcionamiento.' },
  { phase: 2, title: 'Equipo de limpieza', description: 'El equipo de limpieza está ordenado, en buen estado y accesible en su lugar.' },
  { phase: 2, title: 'Residuos & contenedores', description: 'Los contenedores están ordenados, etiquetados y sin rebosar, y el reciclaje se separa correctamente.' },
  { phase: 2, title: 'Fuentes de suciedad', description: 'Las fuentes de suciedad están identificadas y controladas para mantener el área limpia.' },
  // 4S Estandarizar
  { phase: 3, title: 'Control visual', description: 'Las áreas, pasillos, pisos y equipos están demarcados y señalizados adecuadamente según los estándares de la planta.' },
  { phase: 3, title: 'Auditorías 5S', description: 'Las auditorías 5S se realizan periódicamente, las acciones se registran y se les da seguimiento.' },
  { phase: 3, title: 'Seguridad', description: 'Los estándares de seguridad (EPP, rutas de evacuación, equipo contra incendio) están visibles y se cumplen.' },
  // 5S Sostener
  { phase: 4, title: 'Control de documentos', description: 'Los documentos del área están controlados, actualizados y accesibles.' },
  { phase: 4, title: 'Documentación 5S', description: 'Las auditorías 5S y documentación están actualizadas y las acciones son visibles.' },
]

export const PHASE_SIZES = [5, 5, 5, 3, 2]

export function phaseAverages(scores) {
  // scores: array de 20 números (o null). Devuelve promedios por fase.
  const out = []
  let i = 0
  for (const size of PHASE_SIZES) {
    const slice = scores.slice(i, i + size).filter((s) => s !== null && s !== undefined)
    out.push(slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : null)
    i += size
  }
  return out
}

export function totalAverage(scores) {
  const done = scores.filter((s) => s !== null && s !== undefined)
  if (!done.length) return null
  return done.reduce((a, b) => a + b, 0) / done.length
}
