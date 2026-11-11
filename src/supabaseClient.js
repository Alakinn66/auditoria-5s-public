import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const PIN = import.meta.env.VITE_APP_PIN || ''

// ¿Hay backend configurado? Sin Supabase la app entra en "modo local":
// guarda las auditorías solo en el navegador (localStorage) y avisa con
// un banner. Con Supabase configurado, todos comparten los mismos datos.
export const SUPABASE_CONFIGURED = Boolean(url && anonKey)

export const supabase = SUPABASE_CONFIGURED ? createClient(url, anonKey) : null
