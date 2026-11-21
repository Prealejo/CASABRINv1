import { useState } from 'react'
import { KeyRound, Copy, Check, Printer, TriangleAlert } from 'lucide-react'

/**
 * Muestra un código de recuperación recién generado (se ve UNA sola vez).
 * Permite copiarlo o imprimir una tarjeta para entregarla al usuario.
 */
export default function CodigoRecuperacionCard({ codigo, usuario }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch { /* el navegador no permitió copiar: el código sigue visible */ }
  }

  function imprimir() {
    const v = window.open('', '_blank', 'width=480,height=360')
    if (!v) return
    const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
    v.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Código de recuperación</title>
      <style>
        body{font-family:system-ui,Segoe UI,sans-serif;margin:24px;color:#1f2328}
        .t{border:2px dashed #c8151c;border-radius:12px;padding:20px;max-width:380px}
        h1{font-size:16px;margin:0 0 4px;color:#a51117} p{font-size:13px;margin:4px 0}
        .c{font-family:Consolas,monospace;font-size:26px;font-weight:700;letter-spacing:2px;margin:14px 0}
      </style></head><body><div class="t">
      <h1>Casa Brin — Código de recuperación</h1>
      <p>Usuario: <strong>${esc(usuario)}</strong></p>
      <div class="c">${esc(codigo)}</div>
      <p>Úsalo en «¿Olvidaste tu contraseña?». Sirve una sola vez.</p>
      <p>Guárdalo en un lugar seguro y no lo compartas.</p>
      </div><script>window.onload=()=>{window.print();}</script></body></html>`)
    v.document.close()
  }

  return (
    <div className="codigo-card">
      <div className="codigo-card-cab">
        <KeyRound size={16} strokeWidth={2} aria-hidden="true" />
        Código de recuperación{usuario ? <> de <strong>{usuario}</strong></> : null}
      </div>
      <div className="codigo-card-valor mono" aria-label={`Código ${codigo.split('').join(' ')}`}>{codigo}</div>
      <div className="codigo-card-acciones">
        <button type="button" className="btn btn-secondary btn-sm" onClick={copiar}>
          {copiado
            ? <><Check size={14} strokeWidth={2} aria-hidden="true" />Copiado</>
            : <><Copy size={14} strokeWidth={2} aria-hidden="true" />Copiar</>}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={imprimir}>
          <Printer size={14} strokeWidth={2} aria-hidden="true" />Imprimir tarjeta
        </button>
      </div>
      <p className="codigo-card-aviso">
        <TriangleAlert size={14} strokeWidth={2} aria-hidden="true" />
        Solo se muestra ahora. Sirve una vez y reemplaza al código anterior.
      </p>
      <span className="sr-only" aria-live="polite">{copiado ? 'Código copiado al portapapeles' : ''}</span>
    </div>
  )
}
