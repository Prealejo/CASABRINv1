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
  placeholder = 'Escanea o escribe el código',
  label = 'Código de barras del rollo',
  ayuda = 'Utiliza el lector de códigos o ingresa el código manualmente.',
  autoFocus = true,
  focoSenal = 0,   // al cambiar, devuelve el foco al campo (p. ej. tras registrar un corte)
}) {
  const id = useId()
  const ref = useRef(null)
  const [valor, setValor] = useState('')

  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus, focoSenal])

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
          <ScanBarcode className="control-icono" size={20} strokeWidth={1.75} aria-hidden="true" />
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
            aria-describedby={ayuda ? `${id}-ayuda` : undefined}
          />
        </div>
        <button type="button" className="btn btn-primary escaner-btn" onClick={enviar}>
          <Search size={18} strokeWidth={1.75} aria-hidden="true" />
          Buscar
        </button>
      </div>
      {ayuda && <span className="campo-ayuda" id={`${id}-ayuda`}>{ayuda}</span>}
    </div>
  )
}
