import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

/**
 * Dibuja el codigo de barras (Code128) en un SVG con JsBarcode.
 * Se usa tanto en pantalla como en la vista de impresion de etiquetas.
 */
export default function BarcodeLabel({ codigo, titulo, subtitulo, ancho = 2, alto = 60 }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!codigo || !svgRef.current) return
    try {
      JsBarcode(svgRef.current, codigo, {
        format: 'CODE128',
        width: ancho,
        height: alto,
        displayValue: true,
        fontOptions: 'bold',
        font: 'JetBrains Mono, monospace',
        fontSize: 14,
        margin: 6,
        background: '#ffffff'
      })
    } catch (e) {
      // codigo invalido: no rompe la UI
      console.error('Error generando barcode', e)
    }
  }, [codigo, ancho, alto])

  return (
    <div className="etiqueta">
      {titulo && <div className="etiqueta-titulo">{titulo}</div>}
      {subtitulo && <div className="etiqueta-sub">{subtitulo}</div>}
      <svg ref={svgRef} />
    </div>
  )
}
