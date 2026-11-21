import { useEffect, useId, useRef, useState } from 'react'
import { ScanBarcode, Search } from 'lucide-react'

/**
 * Campo optimizado para pistolas lectoras (funcionan como teclado HID:
 * "teclean" el codigo y terminan con Enter). Se mantiene enfocado para
 * capturar la lectura aunque el usuario no haga clic. Tambien permite
 * escribir el codigo a mano y presionar Enter o el boton Buscar.
 */
export default function BarcodeInput({
  onScan,
  placeholder = 'Escanea o escribe el código…',
  label = 'Código de barras del rollo',
  autoFocus = true,
}) {
  const id = useId()
  const ref = useRef(null)
  const [valor, setValor] = useState('')

  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  function enviar() {
    const cod = valor.trim()
    if (!cod) return
    onScan(cod)
    setValor('')
    ref.current?.focus()
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      enviar()
    }
  }

  // Reenfoca SOLO cuando el foco se pierde "al vacio" (caso pistola/idle).
  // Si el usuario hizo clic en otro control (select, input, boton, enlace),
  // NO le robamos el foco, para que pueda usar ese control con normalidad.
  function onBlur(e) {
    if (!autoFocus) return
    const destino = e.relatedTarget
    if (destino && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A', 'OPTION'].includes(destino.tagName)) return
    if (destino && destino.isContentEditable) return
    setTimeout(() => {
      const activo = document.activeElement
      // Solo reenfoca si nadie mas tomo el foco (quedo en el body).
      if (!activo || activo === document.body) ref.current?.focus()
    }, 60)
  }

  return (
    <div className="campo escaner-campo">
      <label htmlFor={id}>{label}</label>
      <div className="escaner-fila">
        <div className="control con-icono escaner-control">
          <ScanBarcode className="control-icono" size={22} strokeWidth={1.75} aria-hidden="true" />
          <input
            id={id}
            ref={ref}
            className="mono"
            value={valor}
            placeholder={placeholder}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            aria-describedby={`${id}-ayuda`}
          />
        </div>
        <button type="button" className="btn btn-primary escaner-btn" onClick={enviar}>
          <Search size={18} strokeWidth={1.75} aria-hidden="true" />
          Buscar
        </button>
      </div>
      <span className="campo-ayuda" id={`${id}-ayuda`}>Usa la pistola lectora o escribe el código y presiona Enter.</span>
    </div>
  )
}
