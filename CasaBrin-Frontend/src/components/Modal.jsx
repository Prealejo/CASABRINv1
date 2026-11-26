import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Diálogo accesible: cierra con Esc o clic fuera, atrapa el foco dentro
 * y lo devuelve al elemento que lo abrió. En pantallas estrechas se muestra
 * como hoja inferior (bottom sheet).
 */
export default function Modal({ abierto, titulo, icono: Icono, onCerrar, children, pie, ancho = 560, lateral = false }) {
  const idTitulo = useId()
  const ref = useRef(null)
  const previo = useRef(null)
  const cerrarRef = useRef(onCerrar)
  cerrarRef.current = onCerrar   // siempre la última versión, sin reiniciar el efecto

  useEffect(() => {
    if (!abierto) return
    previo.current = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Enfoca el primer campo editable (o el diálogo).
    const t = setTimeout(() => {
      const primero = ref.current?.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
      ;(primero || ref.current)?.focus()
    }, 30)

    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); cerrarRef.current?.() }
      if (e.key !== 'Tab' || !ref.current) return
      const foco = [...ref.current.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )]
      if (!foco.length) return
      const first = foco[0]
      const last = foco[foco.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previo.current?.focus?.()
    }
  }, [abierto])

  if (!abierto) return null

  return createPortal(
    <div className={`modal-fondo ${lateral ? 'lateral' : ''}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar?.() }}>
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        style={lateral ? undefined : { maxWidth: ancho }}
      >
        <div className="modal-cab">
          <h2 id={idTitulo} className="modal-titulo">
            {Icono && <Icono size={20} strokeWidth={1.75} aria-hidden="true" />}
            {titulo}
          </h2>
          <button type="button" className="btn btn-ghost btn-sm btn-icon modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <div className="modal-cuerpo">{children}</div>
        {pie && <div className="modal-pie">{pie}</div>}
      </div>
    </div>,
    document.body,
  )
}
