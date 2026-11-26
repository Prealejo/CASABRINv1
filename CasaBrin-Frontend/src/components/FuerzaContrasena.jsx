import { Check } from 'lucide-react'
import { reglasContrasena } from '../lib/contrasena.js'

/** Requisitos de la contraseña en texto compacto; cada uno se marca al cumplirse. */
export default function FuerzaContrasena({ clave, usuario, id }) {
  // Sin texto, ningún requisito se marca como cumplido (evita un "visto" engañoso).
  const reglas = reglasContrasena(clave, usuario).map((r) => ({ ...r, ok: Boolean(clave) && r.ok }))
  return (
    <ul className="fuerza-reglas" id={id} aria-live="polite" aria-label="Requisitos de la contraseña">
      {reglas.map((r) => (
        <li key={r.id} className={r.ok ? 'ok' : ''}>
          {r.ok ? <Check size={13} strokeWidth={2.5} aria-hidden="true" /> : <span className="fuerza-punto" aria-hidden="true">·</span>}
          {r.texto}
          <span className="sr-only">{r.ok ? ' (cumplido)' : ' (pendiente)'}</span>
        </li>
      ))}
    </ul>
  )
}
