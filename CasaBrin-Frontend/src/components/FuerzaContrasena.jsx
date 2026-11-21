import { Check, Circle } from 'lucide-react'
import { reglasContrasena } from '../lib/contrasena.js'

/** Lista de requisitos que se marcan en vivo mientras se escribe la contraseña. */
export default function FuerzaContrasena({ clave, usuario, id }) {
  // Sin texto, ningún requisito se marca como cumplido (evita un "visto" engañoso).
  const reglas = reglasContrasena(clave, usuario).map((r) => ({ ...r, ok: Boolean(clave) && r.ok }))
  const cumplidas = reglas.filter((r) => r.ok).length
  const nivel = !clave ? 0 : cumplidas <= 2 ? 1 : cumplidas === 3 ? 2 : 3
  const textos = ['', 'Débil', 'Casi lista', 'Segura']

  return (
    <div className="fuerza" id={id} aria-live="polite">
      <div className="fuerza-barra" data-nivel={nivel} aria-hidden="true">
        <span /><span /><span />
      </div>
      {clave && <span className="fuerza-texto" data-nivel={nivel}>{textos[nivel]}</span>}
      <ul className="fuerza-reglas">
        {reglas.map((r) => (
          <li key={r.id} className={r.ok ? 'ok' : ''}>
            {r.ok
              ? <Check size={14} strokeWidth={2.5} aria-hidden="true" />
              : <Circle size={10} strokeWidth={2} aria-hidden="true" />}
            {r.texto}
            <span className="sr-only">{r.ok ? ' (cumplido)' : ' (pendiente)'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
