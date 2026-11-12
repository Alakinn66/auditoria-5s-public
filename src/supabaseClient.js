import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const PIN = import.meta.env.VITE_APP_PIN || ''

// PIN de auditor (opcional): si está configurado, el PIN inicial decide
// la vista — el PIN de auditor entra directo a la vista Auditor y el PIN
// general (VITE_APP_PIN) entra directo a Consultar resultados, sin
// pantalla de selección. Sin este valor, tras el PIN general la app
// pregunta qué vista quieres usar.
export const AUDITOR_PIN = import.meta.env.VITE_AUDITOR_PIN || ''

// ¿Hay backend configurado? Sin Supabase la app entra en "modo local":
// guarda las auditorías solo en el navegador (localStorage) y avisa con
// un banner. Con Supabase configurado, todos comparten los mismos datos.
export const SUPABASE_CONFIGURED = Boolean(url && anonKey)

export const supabase = SUPABASE_CONFIGURED ? createClient(url, anonKey) : null
