import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import BarcodeLabel from '../components/BarcodeLabel.jsx'
import {
  Layers, Cylinder, Plus, TriangleAlert, Palette, Shapes, Ruler, MapPin,
  Trash2, StickyNote, ClipboardCheck, PackageCheck, Tag, Printer, ArrowLeftRight, ClipboardList, SwatchBook,
} from 'lucide-react'
import { fmtMetros } from '../lib/format.js'
import Campo from '../components/Campo.jsx'
import TelaPicker from '../components/TelaPicker.jsx'
import ProveedorCampo from '../components/ProveedorCampo.jsx'
import Stepper from '../components/Stepper.jsx'
import { ICONO, ICONO_SM, Mensaje } from '../components/ui.jsx'
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

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Ingreso de mercadería</h1>
          <p>Registra la tela y genera los rollos con su código de barras.</p>
        </div>
      </div>

      {error && <Mensaje tipo="error" className="no-print">{error}</Mensaje>}

      {/* -------- Paso 1: tela -------- */}
      <div className="card no-print mb">
        <div className="seccion-titulo">
          <span className="titulo-icono"><Layers {...ICONO} aria-hidden="true" />Tela</span>
        </div>
        <div className="segmento" role="group" aria-label="Tipo de tela">
          <button type="button" aria-pressed={modo === 'existente'} onClick={() => cambiarModo('existente')}>
            <Cylinder size={16} strokeWidth={1.75} aria-hidden="true" />Tela existente
          </button>
          <button type="button" aria-pressed={modo === 'nueva'} onClick={() => cambiarModo('nueva')}>
            <Plus size={16} strokeWidth={1.75} aria-hidden="true" />Tela nueva
          </button>
        </div>

        {modo === 'existente' ? (
          <Campo label="Tela" requerido error={errores.idTela} style={{ marginBottom: 0 }}>
            <TelaPicker telas={telas} value={idTela} onChange={(v) => { setIdTela(v); limpiarError('idTela') }} />
          </Campo>
        ) : (
          <>
            <div className="fila">
              <Campo label="Nombre de la tela" icon={Layers} requerido error={errores.nombre} style={{ flex: 2 }}>
                <input value={nueva.nombre} onChange={(e) => { setNueva({ ...nueva, nombre: e.target.value }); limpiarError('nombre') }} placeholder="Ej. Satin" />
              </Campo>
              <Campo
                label="Código de color"
                icon={SwatchBook}
                error={errores.codigoColor}
                ayuda="El código que trae el proveedor. Se guarda en mayúsculas."
              >
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
            </div>

            <div className="fila">
              <Campo label="Color" icon={Palette}>
                <input value={nueva.color} onChange={(e) => setNueva({ ...nueva, color: e.target.value })} placeholder="Ej. Azul marino" />
              </Campo>
              <Campo label="Diseño" icon={Shapes}>
                <input value={nueva.diseno} onChange={(e) => setNueva({ ...nueva, diseno: e.target.value })} placeholder="Ej. Liso, rayado…" />
              </Campo>
            </div>

            <div className="fila" style={{ alignItems: 'flex-start' }}>
              <ProveedorCampo
                style={{ flex: 2 }}
                proveedores={proveedores}
                value={nueva.idProveedor}
                onChange={(v) => setNueva((n) => ({ ...n, idProveedor: v }))}
                onCreado={(p) => setProveedores((ps) => [...ps, p].sort((x, y) => x.nombre.localeCompare(y.nombre)))}
              />
              <Campo
                label="Stock mínimo de alerta (m)"
                icon={TriangleAlert}
                requerido
                error={errores.stockMinimo}
                ayuda="Avisa cuando la tela baje de estos metros."
              >
                <input type="number" min="1" step="1" value={nueva.stockMinimo} onChange={(e) => { setNueva({ ...nueva, stockMinimo: e.target.value }); limpiarError('stockMinimo') }} placeholder="20" />
              </Campo>
            </div>
          </>
        )}
      </div>

      {/* -------- Paso 2: rollos -------- */}
      <div className="card no-print mb">
        <div className="seccion-titulo">
          <span className="titulo-icono"><Cylinder {...ICONO} aria-hidden="true" />Rollos a ingresar</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={agregarLinea}>
            <Plus size={16} strokeWidth={1.75} aria-hidden="true" />Agregar línea
          </button>
        </div>
        <p className="texto-ayuda">
          Cada línea genera <strong>N piezas</strong> (rollos) de los mismos metros en una ubicación.
          Ejemplo: 3 piezas de 40 m a Bodega y 1 pieza de 40 m al Local = dos líneas.
        </p>

        {lineas.map((l, i) => (
          <div className="linea" key={i} role="group" aria-label={`Línea ${i + 1}`}>
            <Campo label="Metros por rollo" icon={Ruler} requerido error={errLinea(i, 'metros')}>
              <input type="number" min="0.01" step="0.01" value={l.metros} onChange={(e) => setLinea(i, 'metros', e.target.value)} placeholder="Ej. 40" />
            </Campo>
            <Campo label="Piezas (rollos)" requerido error={errLinea(i, 'cantidad')}>
              <Stepper value={l.cantidad} onChange={(v) => setLinea(i, 'cantidad', v)} min={1} max={500} etiqueta="una pieza" />
            </Campo>
            <Campo label="Ubicación" icon={MapPin} requerido error={errLinea(i, 'idUbicacion')} className="campo-ubic">
              <select value={l.idUbicacion} onChange={(e) => setLinea(i, 'idUbicacion', e.target.value)}>
                <option value="">— Selecciona —</option>
                {ubicaciones.map((u) => <option key={u.idUbicacion} value={u.idUbicacion}>{u.nombre}</option>)}
              </select>
            </Campo>
            <button
              type="button"
              className="btn btn-danger-ghost linea-quitar"
              onClick={() => quitarLinea(i)}
              disabled={lineas.length === 1}
              aria-label={`Quitar línea ${i + 1}`}
              title="Quitar línea"
            >
              <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>Quitar</span>
            </button>
          </div>
        ))}

        <Campo label="Observación (opcional)" icon={StickyNote} style={{ marginTop: '0.9rem', marginBottom: 0 }}>
          <input value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Ej. Compra factura #1234" />
        </Campo>
      </div>

      {/* -------- Paso 3: resumen -------- */}
      <div className="resumen no-print" aria-live="polite">
        <div>
          <div className="resumen-titulo"><ClipboardCheck {...ICONO} aria-hidden="true" />Resumen del ingreso</div>
          <div className="resumen-sub">Calculado automáticamente a partir de las líneas.</div>
        </div>
        <div className="resumen-cifras">
          <div className="resumen-cifra">
            <div className="resumen-cifra-valor">{resumen.piezas}</div>
            <div className="resumen-cifra-label"><Cylinder {...ICONO_SM} aria-hidden="true" />rollos</div>
          </div>
          <div className="resumen-cifra">
            <div className="resumen-cifra-valor">{fmtMetros(resumen.metros)}</div>
            <div className="resumen-cifra-label"><Ruler {...ICONO_SM} aria-hidden="true" />en total</div>
          </div>
        </div>
      </div>

      {/* -------- Paso 4: registrar -------- */}
      <div className="acciones-fin no-print">
        <button type="button" className="btn btn-primary" onClick={enviar} disabled={enviando}>
          <PackageCheck {...ICONO} aria-hidden="true" />
          {enviando ? 'Registrando…' : 'Registrar ingreso'}
        </button>
      </div>

      {resultado && (
        <div className="seccion" ref={etiquetasRef}>
          <Mensaje tipo="ok" className="no-print">
            Se registraron {resultado.rollosCreados.length} rollos de <strong>{resultado.telaNombre}</strong>.
            Imprime las etiquetas y pégalas en cada rollo.
          </Mensaje>
          <div className="siguiente-paso no-print mb">
            <span className="siguiente-paso-texto"><Tag {...ICONO_SM} aria-hidden="true" />Siguiente paso: etiquetar los rollos y, si van a venta, trasladarlos al local.</span>
            <div className="siguiente-paso-acciones">
              <Link to="/traslados" className="btn btn-secondary btn-sm"><ArrowLeftRight size={14} strokeWidth={2} aria-hidden="true" />Ir a Traslados</Link>
              <Link to={`/reportes?tela=${resultado.idTela}&tipo=Ingreso`} className="btn btn-ghost btn-sm"><ClipboardList size={14} strokeWidth={2} aria-hidden="true" />Ver ingresos de esta tela</Link>
            </div>
          </div>
          <div className="seccion-titulo">
            <span className="titulo-icono"><Tag {...ICONO} aria-hidden="true" />Etiquetas generadas</span>
            <button type="button" className="btn btn-primary btn-sm no-print" onClick={() => window.print()}>
              <Printer size={16} strokeWidth={1.75} aria-hidden="true" />Imprimir etiquetas
            </button>
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
      )}
    </div>
  )
}
