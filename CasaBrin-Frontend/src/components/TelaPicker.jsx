import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Search, Layers, Truck, RefreshCw, TriangleAlert } from 'lucide-react'
import { fmtMetros } from '../lib/format.js'
import { CodigoColorBadge } from './ui.jsx'

const normalizar = (s) => (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Buscador de telas existentes (combobox accesible).
 * Busca por nombre, código, código de color, color o proveedor y muestra
 * una tarjeta con la tela elegida.
 */
export default function TelaPicker({ telas, value, onChange, id, ...aria }) {
  const autoId = useId()
  const idLista = `${autoId}-lista`
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const inputRef = useRef(null)
  const listaRef = useRef(null)

  const seleccionada = telas.find((t) => String(t.idTela) === String(value))

  const resultados = useMemo(() => {
    const q = normalizar(texto.trim())
    const lista = !q ? telas : telas.filter((t) =>
      [t.nombre, t.codigo, t.codigoColor, t.color, t.proveedor, t.diseno].some((v) => normalizar(v).includes(q)))
    return lista.slice(0, 50)
  }, [telas, texto])

  useEffect(() => { setActivo(0) }, [texto])

  useEffect(() => {
    const el = listaRef.current?.querySelector(`[data-indice="${activo}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activo])

  function elegir(t) {
    onChange(String(t.idTela))
    setTexto('')
    setAbierto(false)
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAbierto(true); setActivo((a) => Math.min(a + 1, resultados.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') {
      if (abierto && resultados[activo]) { e.preventDefault(); elegir(resultados[activo]) }
    } else if (e.key === 'Escape') { setAbierto(false) }
  }

  if (seleccionada) {
    return (
      <div className="tela-elegida">
        <span className="tela-elegida-icono"><Layers size={20} strokeWidth={1.75} aria-hidden="true" /></span>
        <div className="tela-elegida-info">
          <div className="tela-elegida-nombre">
            {seleccionada.nombre}
            {seleccionada.color && <span className="tenue"> · {seleccionada.color}</span>}
          </div>
          <div className="tela-meta">
            <span className="mono">{seleccionada.codigo}</span>
            {seleccionada.codigoColor && <CodigoColorBadge codigo={seleccionada.codigoColor} />}
            {seleccionada.proveedor && <span><Truck size={13} strokeWidth={2} aria-hidden="true" />{seleccionada.proveedor}</span>}
            <span>Stock: <strong>{fmtMetros(seleccionada.metrosTotales)}</strong></span>
            {seleccionada.bajoStock && <span className="badge badge-alerta"><TriangleAlert size={12} strokeWidth={2} aria-hidden="true" />Stock bajo</span>}
          </div>
        </div>
        <button
          id={id}
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => { onChange(''); setTimeout(() => inputRef.current?.focus(), 0) }}
        >
          <RefreshCw size={14} strokeWidth={2} aria-hidden="true" />Cambiar
        </button>
      </div>
    )
  }

  return (
    <div className="combo">
      <div className="control con-icono">
        <Search className="control-icono" size={18} strokeWidth={1.75} aria-hidden="true" />
        <input
          {...aria}
          id={id}
          ref={inputRef}
          role="combobox"
          aria-expanded={abierto}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-activedescendant={abierto && resultados[activo] ? `${idLista}-${resultados[activo].idTela}` : undefined}
          value={texto}
          placeholder="Busca por nombre, código, código de color o proveedor…"
          autoComplete="off"
          onChange={(e) => { setTexto(e.target.value); setAbierto(true) }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          onKeyDown={onKeyDown}
        />
      </div>
      {abierto && (
        <ul className="combo-lista" id={idLista} role="listbox" ref={listaRef} aria-label="Telas">
          {resultados.length === 0 ? (
            <li className="combo-vacio" role="option" aria-disabled="true" aria-selected="false">
              No hay telas que coincidan. Usa «Tela nueva» para registrarla.
            </li>
          ) : resultados.map((t, i) => (
            <li
              key={t.idTela}
              id={`${idLista}-${t.idTela}`}
              data-indice={i}
              role="option"
              aria-selected={i === activo}
              className={`combo-opcion ${i === activo ? 'activa' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); elegir(t) }}
              onMouseEnter={() => setActivo(i)}
            >
              <div className="combo-opcion-principal">
                <span className="combo-opcion-nombre">{t.nombre}{t.color ? <span className="tenue"> · {t.color}</span> : null}</span>
                <span className="mono tenue">{fmtMetros(t.metrosTotales)}</span>
              </div>
              <div className="tela-meta">
                <span className="mono">{t.codigo}</span>
                {t.codigoColor && <CodigoColorBadge codigo={t.codigoColor} />}
                {t.proveedor && <span><Truck size={12} strokeWidth={2} aria-hidden="true" />{t.proveedor}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
