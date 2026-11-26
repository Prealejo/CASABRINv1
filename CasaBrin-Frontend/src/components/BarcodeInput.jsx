import { useEffect, useId, useRef, useState } from 'react'
import { ScanBarcode, Search } from 'lucide-react'

// Formato de los códigos de rollo que genera el sistema: CB + 8 dígitos.
const PATRON_ROLLO = /CB\d{8}/g

/**
 * Si por error llegan varios códigos pegados ("CB00000003CB00000004"),
 * se usa el último: es el que se acaba de escanear.
 */
export function ultimoCodigo(texto) {
  const limpio = (texto || '').trim().toUpperCase()
  const encontrados = limpio.match(PATRON_ROLLO)
  return encontrados && encontrados.length > 1 ? encontrados[encontrados.length - 1] : limpio
}

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
  codigoExterno = null,   // { codigo, n }: código llegado de fuera (pistola en otra pantalla)
}) {
  const id = useId()
  const ref = useRef(null)
  const [valor, setValor] = useState('')
  // true después de una búsqueda: la próxima tecla (pistola o teclado) reemplaza
  // todo el campo, así nunca se acumulan códigos uno detrás de otro.
  const reemplazar = useRef(false)

  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus, focoSenal])

  // Muestra en el campo el código leído desde otra pantalla.
  useEffect(() => {
    if (!codigoExterno?.codigo) return
    setValor(codigoExterno.codigo)
    reemplazar.current = true
    requestAnimationFrame(() => { ref.current?.focus(); ref.current?.select() })
  }, [codigoExterno?.n])

  // El código queda visible y seleccionado: la siguiente lectura lo reemplaza.
  function enviar() {
    const cod = ultimoCodigo(valor)
    if (!cod) return
    setValor(cod)
    reemplazar.current = true
    onScan(cod)
    requestAnimationFrame(() => { ref.current?.focus(); ref.current?.select() })
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      enviar()
      return
    }
    if (!reemplazar.current || e.ctrlKey || e.metaKey || e.altKey) return
    // Primera tecla después de una búsqueda: borra la búsqueda anterior.
    if (e.key.length === 1) {
      e.preventDefault()
      setValor(e.key)
      reemplazar.current = false
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      setValor('')
      reemplazar.current = false
    }
  }

  function onPaste(e) {
    if (!reemplazar.current) return
    e.preventDefault()
    setValor((e.clipboardData?.getData('text') || '').trim())
    reemplazar.current = false
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
            onPaste={onPaste}
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
