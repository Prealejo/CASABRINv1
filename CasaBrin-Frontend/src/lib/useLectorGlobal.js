import { useEffect, useRef } from 'react'

/**
 * Detecta lecturas de una pistola de códigos de barras en cualquier pantalla.
 *
 * La pistola funciona como un teclado (HID): "escribe" el código muy rápido
 * (pocos milisegundos entre caracteres) y termina con Enter. Una persona no
 * teclea a esa velocidad, así que así distinguimos una lectura de un tecleo.
 *
 * Solo actúa cuando el foco NO está en un campo editable: si el usuario está
 * escribiendo en un buscador o formulario, la lectura va a ese campo como siempre.
 *
 * @param {(codigo: string) => void} alLeer  se llama con el código leído
 * @param {object} opciones
 *   - longitudMinima: caracteres mínimos para considerar una lectura (por defecto 4)
 *   - msPromedioMax: promedio máximo entre caracteres para considerarlo pistola (por defecto 40 ms;
 *     una persona escribe a ~150 ms por tecla)
 *   - msPausaReinicio: una pausa mayor a esta empieza una secuencia nueva (por defecto 300 ms)
 */
export default function useLectorGlobal(alLeer, { longitudMinima = 4, msPromedioMax = 40, msPausaReinicio = 300, activo = true } = {}) {
  const buffer = useRef('')
  const primera = useRef(0)     // momento del primer carácter de la secuencia
  const ultima = useRef(0)      // momento del último carácter
  const callback = useRef(alLeer)
  callback.current = alLeer

  useEffect(() => {
    if (!activo) return undefined

    function esEditable(el) {
      if (!el || el === document.body) return false
      if (el.isContentEditable) return true
      const tag = el.tagName
      if (tag === 'TEXTAREA' || tag === 'SELECT') return true
      if (tag === 'INPUT') {
        const tipo = (el.getAttribute('type') || 'text').toLowerCase()
        return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes(tipo)
      }
      return false
    }

    function reiniciar() {
      buffer.current = ''
    }

    function onKeyDown(e) {
      if (e.ctrlKey || e.altKey || e.metaKey) { reiniciar(); return }
      if (esEditable(e.target)) { reiniciar(); return }
      // Con una ventana emergente abierta (p. ej. traslado) no se cambia de pantalla.
      if (document.querySelector('[aria-modal="true"]')) { reiniciar(); return }

      const ahora = performance.now()
      const pausa = ahora - ultima.current

      if (e.key === 'Enter') {
        const codigo = buffer.current.trim()
        // Se juzga por el promedio de toda la lectura: tolera un retraso puntual
        // del equipo, pero descarta el tecleo humano.
        const promedio = codigo.length > 1 ? (ultima.current - primera.current) / (codigo.length - 1) : Infinity
        const esLectura = codigo.length >= longitudMinima && promedio <= msPromedioMax && pausa <= msPausaReinicio
        reiniciar()
        if (esLectura) {
          e.preventDefault()
          e.stopPropagation()
          callback.current(codigo)
        }
        return
      }

      if (e.key.length !== 1) return   // Shift, flechas, etc.: no forman parte del código

      if (!buffer.current || pausa > msPausaReinicio) {
        // Primera tecla o pausa larga: empieza una secuencia nueva
        buffer.current = ''
        primera.current = ahora
      }
      buffer.current += e.key
      ultima.current = ahora
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [activo, longitudMinima, msPromedioMax, msPausaReinicio])
}
