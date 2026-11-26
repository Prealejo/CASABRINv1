import { useEffect, useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import {
  Layers, Cylinder, Plus, TriangleAlert, Palette, Shapes, Ruler, MapPin, Trash2, StickyNote, ClipboardCheck,
  PackageCheck, Tag, Printer, ArrowLeftRight, ClipboardList, SwatchBook,
} from 'lucide-react-native'
import { api } from '../api/client'
import { fmtMetros } from '../lib/format'
import { imprimirEtiquetas, subtituloEtiqueta } from '../lib/etiquetas'
import Pantalla from '../components/Pantalla'
import ProveedorCampo from '../components/Proveedor'
import { Campo, Entrada, Segmento, Selector, Stepper } from '../components/campos'
import { Boton, CodigoColorBadge, Mensaje, Seccion, StockBadge, Tarjeta } from '../components/ui'
import { C, R, S, T } from '../theme'

const LINEA = { metros: '', cantidad: '1', idUbicacion: '' }
const NUEVA = { nombre: '', codigoColor: '', color: '', diseno: '', idProveedor: '', stockMinimo: '20' }

export default function Ingreso() {
  const router = useRouter()
  const [modo, setModo] = useState('existente')
  const [telas, setTelas] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  const [idTela, setIdTela] = useState('')
  const [nueva, setNueva] = useState(NUEVA)
  const [lineas, setLineas] = useState([{ ...LINEA }])
  const [observacion, setObservacion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [imprimiendo, setImprimiendo] = useState(false)
  const [error, setError] = useState('')
  const [errores, setErrores] = useState({})
  const [errLinea, setErrLinea] = useState({})
  const [resultado, setResultado] = useState(null)

  async function cargarCatalogos() {
    const [t, p, u] = await Promise.all([api.get('/telas'), api.get('/catalogos/proveedores'), api.get('/catalogos/ubicaciones')])
    setTelas(t.data); setProveedores(p.data); setUbicaciones(u.data)
    return u.data
  }
  useEffect(() => {
    ;(async () => {
      try {
        const ub = await cargarCatalogos()
        if (ub.length) setLineas([{ ...LINEA, idUbicacion: String(ub[0].idUbicacion) }])
      } catch (e) { setError(e.message) }
    })()
  }, [])

  const resumen = useMemo(() => lineas.reduce((acc, l) => {
    const c = parseInt(l.cantidad, 10) || 0
    const m = parseFloat(String(l.metros).replace(',', '.')) || 0
    return { piezas: acc.piezas + c, metros: acc.metros + c * m }
  }, { piezas: 0, metros: 0 }), [lineas])

  const seleccionada = telas.find((t) => String(t.idTela) === String(idTela))

  const limpiarError = (k) => setErrores((e) => { if (!e[k]) return e; const n = { ...e }; delete n[k]; return n })
  function setLinea(i, campo, valor) {
    setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)))
    setErrLinea((e) => { const n = { ...e }; delete n[`${i}-${campo}`]; return n })
  }
  const ubicPorDefecto = () => (ubicaciones.length ? String(ubicaciones[0].idUbicacion) : '')

  function validar() {
    const e = {}
    const el = {}
    if (modo === 'existente') {
      if (!idTela) e.idTela = 'Selecciona una tela existente.'
    } else {
      if (!nueva.nombre.trim()) e.nombre = 'El nombre de la tela es obligatorio.'
      else if (nueva.nombre.trim().length < 2) e.nombre = 'El nombre es demasiado corto.'
      if (nueva.codigoColor.trim().length > 30) e.codigoColor = 'Máximo 30 caracteres.'
      const sm = parseInt(nueva.stockMinimo, 10)
      if (nueva.stockMinimo === '' || Number.isNaN(sm)) e.stockMinimo = 'Indica el mínimo en metros.'
      else if (sm < 1) e.stockMinimo = 'El stock mínimo debe ser 1 o mayor.'
    }
    lineas.forEach((l, i) => {
      if (!(parseFloat(String(l.metros).replace(',', '.')) > 0)) el[`${i}-metros`] = 'Metros > 0'
      if (!(parseInt(l.cantidad, 10) >= 1)) el[`${i}-cantidad`] = 'Mínimo 1'
      if (!l.idUbicacion) el[`${i}-idUbicacion`] = 'Elige ubicación'
    })
    setErrores(e); setErrLinea(el)
    return !Object.keys(e).length && !Object.keys(el).length
  }

  async function enviar() {
    if (enviando) return
    setError('')
    if (!validar()) { setError('Revisa los campos marcados en rojo.'); return }
    setEnviando(true); setResultado(null)
    const body = {
      idTela: modo === 'existente' ? Number(idTela) : null,
      tela: modo === 'nueva' ? {
        nombre: nueva.nombre.trim(), color: nueva.color.trim() || null, codigoColor: nueva.codigoColor.trim() || null,
        diseno: nueva.diseno.trim() || null, idProveedor: nueva.idProveedor ? Number(nueva.idProveedor) : null,
        stockMinimo: parseInt(nueva.stockMinimo, 10),
      } : null,
      lineas: lineas.map((l) => ({ metros: parseFloat(String(l.metros).replace(',', '.')), cantidad: parseInt(l.cantidad, 10), idUbicacion: Number(l.idUbicacion) })),
      observacion: observacion.trim() || null,
    }
    try {
      const { data } = await api.post('/rollos/ingreso', body)
      setResultado(data)
      await cargarCatalogos()
      setLineas([{ ...LINEA, idUbicacion: ubicPorDefecto() }])
      setObservacion('')
      if (modo === 'nueva') { setModo('existente'); setIdTela(String(data.idTela)); setNueva(NUEVA) }
    } catch (e) { setError(e.message) } finally { setEnviando(false) }
  }

  async function imprimir() {
    setImprimiendo(true)
    try { await imprimirEtiquetas(resultado.rollosCreados) } catch (e) { setError(e.message) } finally { setImprimiendo(false) }
  }

  return (
    <Pantalla titulo="Ingreso de mercadería" subtitulo="Registra la tela y genera los rollos con su código de barras.">
      {!!error && <Mensaje tipo="error">{error}</Mensaje>}

      {resultado && (
        <Tarjeta style={{ marginBottom: S.lg, borderColor: C.ok200 }}>
          <Mensaje tipo="ok">Se registraron {resultado.rollosCreados.length} rollos de {resultado.telaNombre}. Imprime las etiquetas y pégalas en cada rollo.</Mensaje>
          <Boton titulo={imprimiendo ? 'Preparando…' : 'Imprimir etiquetas'} icono={Printer} onPress={imprimir} cargando={imprimiendo} bloque />
          <View style={{ flexDirection: 'row', gap: S.sm, marginTop: S.sm }}>
            <Boton chico variante="secundario" icono={ArrowLeftRight} titulo="Trasladar" onPress={() => router.push('/inventario')} style={{ flex: 1 }} />
            <Boton chico variante="secundario" icono={ClipboardList} titulo="Ver ingresos" onPress={() => router.push(`/reportes?tela=${resultado.idTela}&tipo=Ingreso`)} style={{ flex: 1 }} />
          </View>
          <Seccion titulo="Etiquetas generadas" icono={Tag} style={{ marginTop: S.lg }}>
            {resultado.rollosCreados.map((r) => (
              <View key={r.idRollo} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.gray100 }}>
                <Text style={{ fontFamily: 'monospace', fontWeight: '700', color: C.ink }}>{r.codigoBarras}</Text>
                <Text style={T.chico}>{subtituloEtiqueta(r)}</Text>
              </View>
            ))}
          </Seccion>
        </Tarjeta>
      )}

      {/* Paso 1: tela */}
      <Tarjeta>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: S.md }}>
          <Layers size={18} color={C.brand600} /><Text style={T.seccion}>Tela</Text>
        </View>
        <Segmento
          valor={modo}
          onCambio={(m) => { setModo(m); setError(''); setErrores({}) }}
          opciones={[{ valor: 'existente', texto: 'Tela existente', icono: Cylinder }, { valor: 'nueva', texto: 'Tela nueva', icono: Plus }]}
        />
        {modo === 'existente' ? (
          <>
            <Campo etiqueta="Tela" requerido error={errores.idTela} style={{ marginBottom: seleccionada ? S.md : 0 }}>
              <Selector
                valor={idTela}
                onCambio={(v) => { setIdTela(v); limpiarError('idTela') }}
                icono={Cylinder}
                titulo="Buscar tela"
                placeholder="Busca por nombre, código o proveedor"
                buscable
                error={errores.idTela}
                opciones={telas.map((t) => ({
                  valor: String(t.idTela),
                  texto: `${t.nombre}${t.color ? ` · ${t.color}` : ''}`,
                  detalle: [t.codigo, t.codigoColor && `Color ${t.codigoColor}`, t.proveedor, `${fmtMetros(t.metrosTotales)} en stock`].filter(Boolean).join(' · '),
                }))}
              />
            </Campo>
            {seleccionada && (
              <View style={{ padding: S.md, borderRadius: R.sm, borderWidth: 1, borderColor: C.brand200, backgroundColor: C.brand50, gap: 6 }}>
                <Text style={{ fontWeight: '800', fontSize: 16, color: C.ink }}>{seleccionada.nombre}{seleccionada.color ? ` · ${seleccionada.color}` : ''}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'monospace', color: C.gray700 }}>{seleccionada.codigo}</Text>
                  <CodigoColorBadge codigo={seleccionada.codigoColor} />
                  {!!seleccionada.proveedor && <Text style={T.chico}>{seleccionada.proveedor}</Text>}
                  <StockBadge estado={Number(seleccionada.metrosTotales) <= 0 ? 'sin' : seleccionada.bajoStock ? 'bajo' : 'normal'} />
                </View>
                <Text style={T.chico}>Stock actual: <Text style={{ fontWeight: '800', color: C.ink }}>{fmtMetros(seleccionada.metrosTotales)}</Text></Text>
              </View>
            )}
          </>
        ) : (
          <>
            <Campo etiqueta="Nombre de la tela" requerido error={errores.nombre}>
              <Entrada icono={Layers} value={nueva.nombre} onChangeText={(v) => { setNueva({ ...nueva, nombre: v }); limpiarError('nombre') }} placeholder="Ej. Satin" error={errores.nombre} />
            </Campo>
            <Campo etiqueta="Código de color" error={errores.codigoColor} ayuda="El código que trae el proveedor. Se guarda en mayúsculas.">
              <Entrada icono={SwatchBook} value={nueva.codigoColor} onChangeText={(v) => { setNueva({ ...nueva, codigoColor: v.toUpperCase() }); limpiarError('codigoColor') }} placeholder="Ej. AZ-210" autoCapitalize="characters" maxLength={30} mono />
            </Campo>
            <View style={{ flexDirection: 'row', gap: S.sm }}>
              <Campo etiqueta="Color" style={{ flex: 1 }}>
                <Entrada icono={Palette} value={nueva.color} onChangeText={(v) => setNueva({ ...nueva, color: v })} placeholder="Azul marino" />
              </Campo>
              <Campo etiqueta="Diseño" style={{ flex: 1 }}>
                <Entrada icono={Shapes} value={nueva.diseno} onChangeText={(v) => setNueva({ ...nueva, diseno: v })} placeholder="Liso" />
              </Campo>
            </View>
            <ProveedorCampo
              proveedores={proveedores}
              valor={nueva.idProveedor}
              onCambio={(v) => setNueva((n) => ({ ...n, idProveedor: v }))}
              onCreado={(p) => setProveedores((ps) => [...ps, p].sort((a, b) => a.nombre.localeCompare(b.nombre)))}
            />
            <Campo etiqueta="Stock mínimo de alerta (m)" requerido error={errores.stockMinimo} ayuda="Avisa cuando la tela baje de estos metros." style={{ marginBottom: 0 }}>
              <Entrada icono={TriangleAlert} value={nueva.stockMinimo} onChangeText={(v) => { setNueva({ ...nueva, stockMinimo: v.replace(/[^0-9]/g, '') }); limpiarError('stockMinimo') }} keyboardType="number-pad" error={errores.stockMinimo} />
            </Campo>
          </>
        )}
      </Tarjeta>

      {/* Paso 2: rollos */}
      <Seccion
        titulo="Rollos a ingresar"
        icono={Cylinder}
        accion={<Boton chico variante="secundario" icono={Plus} titulo="Agregar línea" onPress={() => setLineas((ls) => [...ls, { ...LINEA, idUbicacion: ubicPorDefecto() }])} />}
      >
        <Text style={[T.chico, { marginBottom: S.md, lineHeight: 19 }]}>
          Cada línea genera N piezas (rollos) de los mismos metros en una ubicación. Ej.: 3 piezas de 40 m a Bodega y 1 de 40 m al Local = dos líneas.
        </Text>
        {lineas.map((l, i) => (
          <Tarjeta key={i} style={{ marginBottom: S.sm, backgroundColor: C.gray50 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.sm }}>
              <Text style={{ fontWeight: '700', color: C.gray700 }}>Línea {i + 1}</Text>
              <Boton chico variante="peligro" icono={Trash2} titulo="Quitar" onPress={() => setLineas((ls) => (ls.length === 1 ? ls : ls.filter((_, idx) => idx !== i)))} deshabilitado={lineas.length === 1} accessibilityLabel={`Quitar línea ${i + 1}`} />
            </View>
            <View style={{ flexDirection: 'row', gap: S.sm }}>
              <Campo etiqueta="Metros por rollo" requerido error={errLinea[`${i}-metros`]} style={{ flex: 1 }}>
                <Entrada icono={Ruler} value={String(l.metros)} onChangeText={(v) => setLinea(i, 'metros', v.replace(/[^0-9.,]/g, ''))} keyboardType="decimal-pad" placeholder="40" error={errLinea[`${i}-metros`]} />
              </Campo>
              <Campo etiqueta="Piezas" requerido error={errLinea[`${i}-cantidad`]} style={{ flex: 1 }}>
                <Stepper valor={l.cantidad} onCambio={(v) => setLinea(i, 'cantidad', v)} min={1} max={500} etiqueta="piezas" />
              </Campo>
            </View>
            <Campo etiqueta="Ubicación" requerido error={errLinea[`${i}-idUbicacion`]} style={{ marginBottom: 0 }}>
              <Selector valor={l.idUbicacion} onCambio={(v) => setLinea(i, 'idUbicacion', v)} icono={MapPin} titulo="Ubicación" error={errLinea[`${i}-idUbicacion`]}
                opciones={ubicaciones.map((u) => ({ valor: String(u.idUbicacion), texto: u.nombre }))} />
            </Campo>
          </Tarjeta>
        ))}
        <Campo etiqueta="Observación (opcional)" style={{ marginTop: S.sm }}>
          <Entrada icono={StickyNote} value={observacion} onChangeText={setObservacion} placeholder="Ej. Compra factura #1234" />
        </Campo>
      </Seccion>

      {/* Paso 3: resumen */}
      <View style={{ backgroundColor: C.brand50, borderColor: C.brand200, borderWidth: 1, borderRadius: R.md, padding: S.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        accessibilityLiveRegion="polite" accessibilityLabel={`Resumen: ${resumen.piezas} rollos, ${fmtMetros(resumen.metros)} en total`}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ClipboardCheck size={18} color={C.brand800} /><Text style={{ fontWeight: '800', color: C.brand800 }}>Resumen</Text>
          </View>
          <Text style={T.mini}>Calculado a partir de las líneas.</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: C.brand700 }}>{resumen.piezas} {resumen.piezas === 1 ? 'rollo' : 'rollos'}</Text>
          <Text style={{ fontWeight: '700', color: C.gray700 }}>{fmtMetros(resumen.metros)} en total</Text>
        </View>
      </View>

      {/* Paso 4: registrar */}
      <Boton titulo={enviando ? 'Registrando…' : 'Registrar ingreso'} icono={PackageCheck} onPress={enviar} cargando={enviando} bloque style={{ marginTop: S.lg }} />
    </Pantalla>
  )
}
