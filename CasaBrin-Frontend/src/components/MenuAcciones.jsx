import { useEffect, useId, useRef, useState } from 'react'
import { EllipsisVertical } from 'lucide-react'
import './menu-acciones.css'

/**
 * Menú contextual de tres puntos para acciones secundarias.
 * Accesible: botón con aria-haspopup/aria-expanded, flechas ↑/↓ para moverse,
 * Esc para cerrar y clic fuera para cerrar.
 *
 *   <MenuAcciones etiqueta="Más acciones de CB0001" items={[
 *     { texto: 'Ver historial', icono: History, onClick: () => … },
 *     { texto: 'Anular', icono: Ban, peligro: true, onClick: () => … },
 *   ]} />
 */
export default function MenuAcciones({ items, etiqueta = 'Más acciones' }) {
  const [abierto, setAbierto] = useState(false)
  const id = useId()
  const raiz = useRef(null)
  const boton = useRef(null)
  const [pos, setPos] = useState(null)   // posición fija respecto a la ventana

  // El menú se posiciona "fixed" junto al botón: así ningún contenedor con
  // desplazamiento (tablas) lo recorta. Si no cabe abajo, se abre hacia arriba.
  function abrir() {
    const r = boton.current?.getBoundingClientRect()
    if (r) {
      const altoEstimado = 48 * items.filter(Boolean).length + 12
      const haciaArriba = r.bottom + altoEstimado > window.innerHeight - 8
      setPos({
        right: Math.max(8, window.innerWidth - r.right),
        ...(haciaArriba ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
      })
    }
    setAbierto(true)
  }

  useEffect(() => {
    if (!abierto) return undefined
    const primero = raiz.current?.querySelector('[role="menuitem"]')
    primero?.focus()
    function fuera(e) { if (!raiz.current?.contains(e.target)) setAbierto(false) }
    function cerrar() { setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    window.addEventListener('resize', cerrar)
    window.addEventListener('scroll', cerrar, true)
    return () => {
      document.removeEventListener('mousedown', fuera)
      window.removeEventListener('resize', cerrar)
      window.removeEventListener('scroll', cerrar, true)
    }
  }, [abierto])

  function onKeyDown(e) {
    const opciones = [...(raiz.current?.querySelectorAll('[role="menuitem"]') || [])]
    const i = opciones.indexOf(document.activeElement)
    if (e.key === 'Escape') { e.stopPropagation(); setAbierto(false); boton.current?.focus() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); opciones[(i + 1) % opciones.length]?.focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); opciones[(i - 1 + opciones.length) % opciones.length]?.focus() }
    else if (e.key === 'Tab') setAbierto(false)
  }

  const visibles = items.filter(Boolean)
  if (!visibles.length) return null

  return (
    <div className="menu-acciones" ref={raiz} onKeyDown={onKeyDown}>
      <button
        ref={boton}
        type="button"
        className="btn btn-ghost btn-sm btn-icon menu-acciones-boton"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? id : undefined}
        aria-label={etiqueta}
        data-tip={etiqueta}
        onClick={(e) => { e.stopPropagation(); if (abierto) setAbierto(false); else abrir() }}
      >
        <EllipsisVertical size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      {abierto && (
        <div className="menu-acciones-lista" role="menu" id={id} aria-label={etiqueta} style={pos ? { position: 'fixed', top: pos.top, bottom: pos.bottom, right: pos.right } : undefined}>
          {visibles.map(({ texto, icono: Icono, onClick, peligro }) => (
            <button
              key={texto}
              type="button"
              role="menuitem"
              className={`menu-acciones-item ${peligro ? 'peligro' : ''}`}
              onClick={(e) => { e.stopPropagation(); setAbierto(false); onClick?.() }}
            >
              {Icono && <Icono size={15} strokeWidth={1.9} aria-hidden="true" />}
              {texto}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
