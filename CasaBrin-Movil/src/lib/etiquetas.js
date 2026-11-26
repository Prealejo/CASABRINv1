import * as Print from 'expo-print'
import { barcodeDataUri } from '../api/client'
import { fmtMetros } from './format'

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

export function subtituloEtiqueta(r) {
  return `${r.codigoColor ? `Color ${r.codigoColor} · ` : ''}${r.ubicacion} · ${fmtMetros(r.metrosActuales)}`
}

/**
 * Imprime etiquetas con código de barras usando el diálogo del sistema (impresora o PDF).
 * El código de barras lo genera el backend (/rollos/{id}/barcode.png, RF-05) y se incrusta
 * como imagen base64, igual de legible que en la web.
 */
export async function imprimirEtiquetas(rollos) {
  const imagenes = await Promise.all(rollos.map((r) => barcodeDataUri(r.idRollo).catch(() => null)))
  const tarjetas = rollos.map((r, i) => `
    <div class="et">
      <div class="t">${esc(r.telaNombre)}</div>
      <div class="s">${esc(subtituloEtiqueta(r))}</div>
      ${imagenes[i] ? `<img src="${imagenes[i]}" alt="${esc(r.codigoBarras)}"/>` : ''}
      <div class="c">${esc(r.codigoBarras)}</div>
    </div>`).join('')

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;margin:12px}
      .grid{display:flex;flex-wrap:wrap;gap:10px}
      .et{width:230px;border:1px solid #bbb;border-radius:8px;padding:8px;text-align:center;page-break-inside:avoid}
      .t{font-weight:bold;font-size:14px}.s{font-size:11px;color:#333;margin:2px 0 4px}
      img{width:100%;height:auto;image-rendering:pixelated}.c{font-family:monospace;font-weight:bold;font-size:13px}
    </style></head><body><div class="grid">${tarjetas}</div></body></html>`

  await Print.printAsync({ html })
}
