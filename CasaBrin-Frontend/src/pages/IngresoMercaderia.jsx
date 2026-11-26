import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import BarcodeLabel from '../components/BarcodeLabel.jsx'
import { Plus, Trash2, PackageCheck, Printer, ArrowLeftRight } from 'lucide-react'
import { fmtMetros } from '../lib/format.js'
import Campo from '../components/Campo.jsx'
import TelaPicker from '../components/TelaPicker.jsx'
import ProveedorCampo from '../components/ProveedorCampo.jsx'
import Stepper from '../components/Stepper.jsx'
import { Encabezado, Mensaje } from '../components/ui.jsx'
import './pages.css'

const LINEA_VACIA = { metros: '', cantidad: '1', idUbicacion: '' }

export default function IngresoMercaderia() {
  const [modo, setModo] = useState('existente')   // 'existente' | 'nueva'
  const [telas, setTelas] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])

  const [idTela, setIdTela] = useState('')
  const [nueva, setNueva] = useState({
    nombre: '', codigoColor: '', color: '', diseno: '', idProveedor: '', stockMinimo: '20',
  })

  const [lineas, setLineas] = useState([{ ...LINEA_VACIA }])
  const [observacion, setObservacion] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [errores, setErrores] = useState({})       // validaciones por campo
  const [erroresLinea, setErroresLinea] = useState({})
  const [resultado, setResultado] = useState(null)
  const etiquetasRef = useRef(null)

  async function cargarCatalogos() {
    const [t, pr, ub] = await Promise.all([
      api.get('/telas'),
      api.get('/catalogos/proveedores'),
      api.get('/catalogos/ubicaciones'),
    ])
    setTelas(t.data)
    setProveedores(pr.data)
    setUbicaciones(ub.data)
    return ub.data
  }

  useEffect(() => {
    ;(async () => {
      try {
        const ub = await cargarCatalogos()
        if (ub.length) setLineas([{ ...LINEA_VACIA, idUbicacion: String(ub[0].idUbicacion) }])
      } catch (e) {
        setError(e.message)
      }
    })()
  }, [])

  const resumen = useMemo(() => {
    let piezas = 0
    let metros = 0
    for (const l of lineas) {
      const c = parseInt(l.cantidad, 10) || 0
      const m = parseFloat(l.metros) || 0
      piezas += c
      metros += c * m
    }
    return { piezas, metros }
  }, [lineas])

  // ---------- helpers de campos ----------
  function limpiarError(campo) {
    setErrores((e) => { if (!e[campo]) return e; const n = { ...e }; delete n[campo]; return n })
  }
  function setLinea(i, campo, valor) {
    setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)))
    setErroresLinea((e) => { if (!e[`${i}-${campo}`]) return e; const n = { ...e }; delete n[`${i}-${campo}`]; return n })
  }
  function agregarLinea() {
    const idUb = ubicaciones.length ? String(ubicaciones[0].idUbicacion) : ''
    setLineas((ls) => [...ls, { ...LINEA_VACIA, idUbicacion: idUb }])
  }
  function quitarLinea(i) {
    setLineas((ls) => (ls.length === 1 ? ls : ls.filter((_, idx) => idx !== i)))
  }

  // ---------- validación completa ----------
  function validar() {
    const errs = {}
    const errsLinea = {}

    if (modo === 'existente') {
      if (!idTela) errs.idTela = 'Selecciona una tela existente.'
    } else {
      if (!nueva.nombre.trim()) errs.nombre = 'El nombre de la tela es obligatorio.'
      else if (nueva.nombre.trim().length < 2) errs.nombre = 'El nombre es demasiado corto.'
      const sm = parseInt(nueva.stockMinimo, 10)
      if (nueva.codigoColor.trim().length > 30) errs.codigoColor = 'Máximo 30 caracteres.'
      if (nueva.stockMinimo === '' || isNaN(sm)) errs.stockMinimo = 'Indica el mínimo en metros.'
      else if (sm < 1) errs.stockMinimo = 'El stock mínimo debe ser 1 o mayor.'
    }

    if (!lineas.length) errs.lineas = 'Agrega al menos una línea de rollos.'
    lineas.forEach((l, i) => {
      if (!(parseFloat(l.metros) > 0)) errsLinea[`${i}-metros`] = 'Metros > 0'
      if (!(parseInt(l.cantidad, 10) >= 1)) errsLinea[`${i}-cantidad`] = 'Mínimo 1'
      if (!l.idUbicacion) errsLinea[`${i}-idUbicacion`] = 'Elige ubicación'
    })

    setErrores(errs)
    setErroresLinea(errsLinea)
    return Object.keys(errs).length === 0 && Object.keys(errsLinea).length === 0
  }

  async function enviar() {
    setError('')
    if (!validar()) { setError('Revisa los campos marcados en rojo.'); return }
    setEnviando(true)
    setResultado(null)

    const body = {
      idTela: modo === 'existente' ? Number(idTela) : null,
      tela: modo === 'nueva' ? {
        nombre: nueva.nombre.trim(),
        color: nueva.color.trim() || null,
        codigoColor: nueva.codigoColor.trim() || null,
        diseno: nueva.diseno.trim() || null,
        idProveedor: nueva.idProveedor ? Number(nueva.idProveedor) : null,
        stockMinimo: parseInt(nueva.stockMinimo, 10),
      } : null,
      lineas: lineas.map((l) => ({
        metros: parseFloat(l.metros),
        cantidad: parseInt(l.cantidad, 10),
        idUbicacion: Number(l.idUbicacion),
      })),
      observacion: observacion.trim() || null,
    }

    try {
      const { data } = await api.post('/rollos/ingreso', body)
      setResultado(data)
      await cargarCatalogos()
      const idUb = ubicaciones.length ? String(ubicaciones[0].idUbicacion) : ''
      setLineas([{ ...LINEA_VACIA, idUbicacion: idUb }])
      setObservacion('')
      if (modo === 'nueva') {
        setModo('existente')
        setIdTela(String(data.idTela))
        setNueva({ nombre: '', codigoColor: '', color: '', diseno: '', idProveedor: '', stockMinimo: '20' })
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setEnviando(false)
    }
  }

  const errLinea = (i, campo) => erroresLinea[`${i}-${campo}`]
  function cambiarModo(m) { setModo(m); setError(''); setErrores({}) }
  const totalLinea = (l) => (parseInt(l.cantidad, 10) || 0) * (parseFloat(l.metros) || 0)

  return (
    <div>
      <div className="no-print">
        <Encabezado titulo="Ingreso de mercadería" subtitulo="Registra telas y rollos con su código de barras" />
      </div>

      {error && <Mensaje tipo="error" className="no-print">{error}</Mensaje>}

      {resultado && (
        <section className="panel ingreso-resultado mb" ref={etiquetasRef}>
          <div className="panel-cuerpo">
            <div className="no-print">
              <Mensaje tipo="ok">
                Se registraron {resultado.rollosCreados.length} rollos de <strong>{resultado.telaNombre}</strong>. Imprime las etiquetas y pégalas en cada rollo.
              </Mensaje>
              <div className="acciones-fila">
                <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                  <Printer size={16} strokeWidth={1.9} aria-hidden="true" />Imprimir etiquetas
                </button>
                <Link to="/inventario" className="btn btn-secondary">
                  <ArrowLeftRight size={16} strokeWidth={1.9} aria-hidden="true" />Trasladar desde inventario
                </Link>
                <Link to={`/reportes?tela=${resultado.idTela}&tipo=Ingreso`} className="btn btn-secondary">Ver ingresos de esta tela</Link>
              </div>
            </div>
            <div className="etiquetas-grid">
              {resultado.rollosCreados.map((r) => (
                <BarcodeLabel
                  key={r.idRollo}
                  codigo={r.codigoBarras}
                  titulo={r.telaNombre}
                  subtitulo={`${r.codigoColor ? `Color ${r.codigoColor} · ` : ''}${r.ubicacion} · ${fmtMetros(r.metrosActuales)}`}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* -------- Tela -------- */}
      <section className="panel no-print">
        <div className="panel-cab"><h2>Tela</h2></div>
        <div className="panel-cuerpo">
          <div className="segmento" role="group" aria-label="Tipo de tela">
            <button type="button" aria-pressed={modo === 'existente'} onClick={() => cambiarModo('existente')}>Tela existente</button>
            <button type="button" aria-pressed={modo === 'nueva'} onClick={() => cambiarModo('nueva')}>Tela nueva</button>
          </div>

          {modo === 'existente' ? (
            <Campo label="Tela" requerido error={errores.idTela} style={{ marginBottom: 0, maxWidth: 720 }}>
              <TelaPicker telas={telas} value={idTela} onChange={(v) => { setIdTela(v); limpiarError('idTela') }} />
            </Campo>
          ) : (
            <div className="rejilla-2">
              <Campo label="Nombre de la tela" requerido error={errores.nombre}>
                <input value={nueva.nombre} onChange={(e) => { setNueva({ ...nueva, nombre: e.target.value }); limpiarError('nombre') }} placeholder="Ej. Satin" />
              </Campo>
              <Campo label="Código de color" error={errores.codigoColor} ayuda="El código del proveedor; se guarda en mayúsculas.">
                <input
                  className="mono"
                  value={nueva.codigoColor}
                  maxLength={30}
                  onChange={(e) => { setNueva({ ...nueva, codigoColor: e.target.value.toUpperCase() }); limpiarError('codigoColor') }}
                  placeholder="Ej. AZ-210"
                  autoComplete="off"
                  spellCheck={false}
                />
              </Campo>
              <Campo label="Color">
                <input value={nueva.color} onChange={(e) => setNueva({ ...nueva, color: e.target.value })} placeholder="Ej. Azul marino" />
              </Campo>
              <Campo label="Diseño">
                <input value={nueva.diseno} onChange={(e) => setNueva({ ...nueva, diseno: e.target.value })} placeholder="Ej. Liso, rayado…" />
              </Campo>
              <ProveedorCampo
                proveedores={proveedores}
                value={nueva.idProveedor}
                onChange={(v) => setNueva((n) => ({ ...n, idProveedor: v }))}
                onCreado={(p) => setProveedores((ps) => [...ps, p].sort((x, y) => x.nombre.localeCompare(y.nombre)))}
              />
              <Campo label="Stock mínimo de alerta (m)" requerido error={errores.stockMinimo} ayuda="Avisa cuando la tela baje de estos metros.">
                <input type="number" min="1" step="1" value={nueva.stockMinimo} onChange={(e) => { setNueva({ ...nueva, stockMinimo: e.target.value }); limpiarError('stockMinimo') }} placeholder="20" />
              </Campo>
            </div>
          )}
        </div>
      </section>

      {/* -------- Rollos a ingresar -------- */}
      <section className="panel bloque no-print">
        <div className="panel-cab">
          <div>
            <h2>Rollos a ingresar</h2>
            <p className="sub">Cada línea agrupa rollos con el mismo metraje y ubicación.</p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={agregarLinea}>
            <Plus size={15} strokeWidth={2} aria-hidden="true" />Agregar línea
          </button>
        </div>

        <div className="tabla-scroll">
          <table className="tabla tabla-lineas">
            <thead>
              <tr>
                <th>Metros por rollo</th>
                <th>Cantidad de rollos</th>
                <th>Ubicación</th>
                <th className="num">Total de la línea</th>
                <th><span className="sr-only">Quitar</span></th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l, i) => (
                <tr key={i}>
                  <td data-label="Metros por rollo">
                    <input
                      type="number" min="0.01" step="0.01" value={l.metros} placeholder="Ej. 40"
                      onChange={(e) => setLinea(i, 'metros', e.target.value)}
                      aria-label={`Metros por rollo, línea ${i + 1}`}
                      aria-invalid={errLinea(i, 'metros') ? true : undefined}
                      className={errLinea(i, 'metros') ? 'con-error' : ''}
                    />
                    {errLinea(i, 'metros') && <span className="campo-error">{errLinea(i, 'metros')}</span>}
                  </td>
                  <td data-label="Cantidad de rollos">
                    <Stepper
                      value={l.cantidad} onChange={(v) => setLinea(i, 'cantidad', v)} min={1} max={500} etiqueta="un rollo"
                      aria-label={`Cantidad de rollos, línea ${i + 1}`}
                    />
                    {errLinea(i, 'cantidad') && <span className="campo-error">{errLinea(i, 'cantidad')}</span>}
                  </td>
                  <td data-label="Ubicación">
                    <select
                      value={l.idUbicacion}
                      onChange={(e) => setLinea(i, 'idUbicacion', e.target.value)}
                      aria-label={`Ubicación, línea ${i + 1}`}
                      className={errLinea(i, 'idUbicacion') ? 'con-error' : ''}
                    >
                      <option value="">— Selecciona —</option>
                      {ubicaciones.map((u) => <option key={u.idUbicacion} value={u.idUbicacion}>{u.nombre}</option>)}
                    </select>
                    {errLinea(i, 'idUbicacion') && <span className="campo-error">{errLinea(i, 'idUbicacion')}</span>}
                  </td>
                  <td data-label="Total de la línea" className="num mono total-linea">{fmtMetros(totalLinea(l))}</td>
                  <td className="celda-quitar">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={() => quitarLinea(i)}
                      disabled={lineas.length === 1}
                      aria-label={`Quitar línea ${i + 1}`}
                      data-tip="Quitar línea"
                    >
                      <Trash2 size={16} strokeWidth={1.9} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel-cuerpo">
          <Campo label="Observación (opcional)" style={{ marginBottom: 0 }}>
            <input value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Ej. Compra factura #1234" />
          </Campo>
        </div>
      </section>

      {/* -------- Resumen + registrar -------- */}
      <section className="resumen-barra no-print" aria-live="polite">
        <div className="resumen-barra-datos">
          <span><span className="resumen-barra-etq">Rollos</span><strong>{resumen.piezas}</strong></span>
          <span><span className="resumen-barra-etq">Metros</span><strong>{fmtMetros(resumen.metros)}</strong></span>
        </div>
        <button type="button" className="btn btn-primary" onClick={enviar} disabled={enviando}>
          <PackageCheck size={17} strokeWidth={1.9} aria-hidden="true" />
          {enviando ? 'Registrando…' : 'Registrar ingreso'}
        </button>
      </section>
    </div>
  )
}
