import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import {
  Search, MapPin, ChevronRight, ChevronDown, Layers, Cylinder, PackagePlus, SearchX, History, Truck, Ruler,
  Pencil, Scissors, ArrowLeftRight, SwatchBook, Palette, Shapes, TriangleAlert, Save, X, Copy, Warehouse,
  Store, EllipsisVertical, ClipboardList, Gauge,
} from 'lucide-react-native'
import { api } from '../api/client'
import { fmtMetros, fmtNum, fmtSoloFecha } from '../lib/format'
import { tonoDeColor, esTonoClaro } from '../lib/colores'
import Pantalla from '../components/Pantalla'
import Hoja from '../components/Hoja'
import TrasladoHoja from '../components/Traslado'
import ProveedorCampo from '../components/Proveedor'
import { Campo, Entrada, Selector } from '../components/campos'
import {
  Boton, CodigoColorBadge, EstadoBadge, Esqueleto, Mensaje, StockBadge, UbicacionBadge, Vacio, iconoUbicacion,
} from '../components/ui'
import { C, R, S, T } from '../theme'

const normalizar = (s) => (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const SIN_PROV = 'sin'
const POR_PAGINA = 20

function estadoStock(t) {
  if (Number(t.metrosTotales) <= 0) return 'sin'
  if (t.bajoStock) return 'bajo'
  return 'normal'
}
function telaEnUbicacion(t, nombre) {
  if (!nombre) return true
  const n = nombre.toLowerCase()
  if (n.includes('bodega')) return Number(t.metrosBodega) > 0
  if (n.includes('local')) return Number(t.metrosLocal) > 0
  return true
}

function Muestra({ color }) {
  const tono = tonoDeColor(color)
  return (
    <View
      style={[st.muestra, tono ? { backgroundColor: tono } : st.muestraVacia, esTonoClaro(tono) && { borderColor: C.gray300 }]}
      accessibilityLabel={color ? `Color ${color}` : 'Sin color registrado'}
    />
  )
}

function Kpi({ icono: Icono, etiqueta, valor, detalle, alerta }) {
  return (
    <View style={[st.kpi, alerta && { borderColor: C.warn200 }]}>
      <Icono size={16} color={alerta ? C.warn700 : C.gray700} strokeWidth={1.9} />
      <Text style={T.mini}>{etiqueta}</Text>
      <Text style={[st.kpiValor, alerta && { color: C.warn700 }]}>{valor}</Text>
      {!!detalle && <Text style={T.mini}>{detalle}</Text>}
    </View>
  )
}

/** Menú de acciones secundarias (equivale a los tres puntos de la web). */
function MenuAcciones({ visible, titulo, items, onCerrar }) {
  return (
    <Hoja visible={visible} titulo={titulo} onCerrar={onCerrar} alto="50%">
      {items.map(({ texto, icono: Icono, onPress }) => (
        <Pressable
          key={texto}
          onPress={() => { onCerrar(); onPress() }}
          style={({ pressed }) => [st.menuItem, pressed && { backgroundColor: C.gray100 }]}
          accessibilityRole="button"
        >
          <Icono size={20} color={C.gray600} strokeWidth={1.9} />
          <Text style={{ fontSize: 16, color: C.ink }}>{texto}</Text>
        </Pressable>
      ))}
    </Hoja>
  )
}

export default function Inventario() {
  const router = useRouter()
  const [telas, setTelas] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [buscar, setBuscar] = useState('')
  const [filtroUbic, setFiltroUbic] = useState('')
  const [filtroProv, setFiltroProv] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [pagina, setPagina] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [refrescando, setRefrescando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [abierta, setAbierta] = useState(null)
  const [detalles, setDetalles] = useState({})
  const [traslado, setTraslado] = useState({ abierto: false, codigo: null })
  const [menu, setMenu] = useState(null)      // { titulo, items }
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(null)
  const [errForm, setErrForm] = useState({})
  const [errFicha, setErrFicha] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    setError('')
    try {
      const { data } = await api.get('/telas')
      setTelas(data)
    } catch (e) { setError(e.message) } finally { setCargando(false) }
  }, [])

  useEffect(() => {
    cargar()
    ;(async () => {
      try {
        const [u, p] = await Promise.all([api.get('/catalogos/ubicaciones'), api.get('/catalogos/proveedores')])
        setUbicaciones(u.data); setProveedores(p.data)
      } catch { /* filtros quedan en «Todos» */ }
    })()
  }, [cargar])

  useEffect(() => { if (!ok) return undefined; const t = setTimeout(() => setOk(''), 6000); return () => clearTimeout(t) }, [ok])
  useEffect(() => { setPagina(1) }, [buscar, filtroUbic, filtroProv, filtroEstado])

  const nombreUbic = ubicaciones.find((u) => String(u.idUbicacion) === String(filtroUbic))?.nombre || ''

  const base = useMemo(() => {
    const q = normalizar(buscar.trim())
    return telas
      .filter((t) => !q || [t.nombre, t.codigo, t.codigoColor, t.color, t.proveedor, t.diseno].some((v) => normalizar(v).includes(q)))
      .filter((t) => telaEnUbicacion(t, nombreUbic))
      .filter((t) => !filtroProv || (filtroProv === SIN_PROV ? !t.idProveedor : String(t.idProveedor) === filtroProv))
  }, [telas, buscar, nombreUbic, filtroProv])

  const conteo = useMemo(() => ({
    todas: base.length,
    bajo: base.filter((t) => estadoStock(t) === 'bajo').length,
    sin: base.filter((t) => estadoStock(t) === 'sin').length,
  }), [base])

  const filtradas = filtroEstado ? base.filter((t) => estadoStock(t) === filtroEstado) : base
  const visibles = filtradas.slice(0, pagina * POR_PAGINA)

  const kpi = useMemo(() => ({
    telas: telas.length,
    rollos: telas.reduce((a, t) => a + Number(t.rollosDisponibles || 0), 0),
    metros: telas.reduce((a, t) => a + Number(t.metrosTotales || 0), 0),
    bodega: telas.reduce((a, t) => a + Number(t.metrosBodega || 0), 0),
    local: telas.reduce((a, t) => a + Number(t.metrosLocal || 0), 0),
    bajo: telas.filter((t) => t.bajoStock).length,
  }), [telas])

  async function cargarDetalle(idTela) {
    setDetalles((d) => ({ ...d, [idTela]: { cargando: true, rollos: d[idTela]?.rollos || [] } }))
    try {
      const { data } = await api.get(`/telas/${idTela}`)
      setDetalles((d) => ({ ...d, [idTela]: { cargando: false, rollos: data.rollos || [] } }))
    } catch (e) {
      setDetalles((d) => ({ ...d, [idTela]: { cargando: false, rollos: [], error: e.message } }))
    }
  }
  function toggle(idTela) {
    if (abierta === idTela) { setAbierta(null); return }
    setAbierta(idTela)
    if (!detalles[idTela]) cargarDetalle(idTela)
  }

  async function refrescar() {
    setRefrescando(true)
    await cargar()
    if (abierta) await cargarDetalle(abierta)
    setRefrescando(false)
  }

  function limpiar() { setBuscar(''); setFiltroUbic(''); setFiltroProv(''); setFiltroEstado('') }
  const hayFiltros = Boolean(buscar || filtroUbic || filtroProv || filtroEstado)

  // ---------- Edición de ficha ----------
  function abrirEdicion(t) {
    setEditando(t)
    setForm({
      nombre: t.nombre || '', codigoColor: t.codigoColor || '', color: t.color || '', diseno: t.diseno || '',
      idProveedor: t.idProveedor ? String(t.idProveedor) : '', stockMinimo: String(Number(t.stockMinimo) || 1),
    })
    setErrForm({}); setErrFicha(''); setOk('')
  }
  async function guardarFicha() {
    const e = {}
    if (form.nombre.trim().length < 2) e.nombre = 'El nombre es obligatorio.'
    if (form.codigoColor.trim().length > 30) e.codigoColor = 'Máximo 30 caracteres.'
    const sm = parseInt(form.stockMinimo, 10)
    if (!(sm >= 1)) e.stockMinimo = 'Debe ser 1 o mayor.'
    setErrForm(e)
    if (Object.keys(e).length) return
    setGuardando(true); setErrFicha('')
    try {
      await api.put(`/telas/${editando.idTela}/ficha`, {
        nombre: form.nombre.trim(), color: form.color.trim() || null, codigoColor: form.codigoColor.trim() || null,
        diseno: form.diseno.trim() || null, idProveedor: form.idProveedor ? Number(form.idProveedor) : null, stockMinimo: sm,
      })
      const id = editando.idTela
      setOk(`Ficha de «${form.nombre.trim()}» actualizada.`)
      setEditando(null)
      await cargar()
      if (detalles[id]) cargarDetalle(id)
    } catch (err) { setErrFicha(err.message) } finally { setGuardando(false) }
  }

  async function alTrasladar(rollo, destino) {
    setTraslado({ abierto: false, codigo: null })
    setOk(`Rollo ${rollo.codigoBarras} trasladado a ${destino}. Quedó registrado en su historial.`)
    await cargar()
    if (detalles[rollo.idTela]) cargarDetalle(rollo.idTela)
  }

  const PESTANAS = [
    { id: '', texto: 'Todas', n: conteo.todas },
    { id: 'bajo', texto: 'Stock bajo', n: conteo.bajo },
    { id: 'sin', texto: 'Sin stock', n: conteo.sin },
  ]

  return (
    <Pantalla
      titulo="Inventario de telas"
      subtitulo="Gestiona las existencias y movimientos de tus telas"
      onRefrescar={refrescar}
      refrescando={refrescando}
      acciones={(
        <>
          <Boton titulo="Trasladar rollo" icono={ArrowLeftRight} variante="secundario" onPress={() => { setOk(''); setTraslado({ abierto: true, codigo: null }) }} style={{ flex: 1 }} />
          <Boton titulo="Ingresar" icono={PackagePlus} onPress={() => router.push('/ingreso')} style={{ flex: 1 }} accessibilityLabel="Ingresar mercancía" />
        </>
      )}
    >
      {/* Indicadores */}
      <View style={st.kpis}>
        {cargando ? [0, 1, 2, 3].map((i) => <View key={i} style={st.kpi}><Esqueleto alto={52} /></View>) : (
          <>
            <Kpi icono={Layers} etiqueta="Telas registradas" valor={fmtNum(kpi.telas)} />
            <Kpi icono={Cylinder} etiqueta="Rollos disponibles" valor={fmtNum(kpi.rollos)} />
            <Kpi icono={Ruler} etiqueta="Metros en stock" valor={fmtMetros(kpi.metros)} detalle={`Bodega ${fmtMetros(kpi.bodega)} · Local ${fmtMetros(kpi.local)}`} />
            <Kpi icono={TriangleAlert} etiqueta="Telas con stock bajo" valor={fmtNum(kpi.bajo)} alerta={kpi.bajo > 0} />
          </>
        )}
      </View>

      {/* Pestañas rápidas */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: S.md }} accessibilityRole="tablist">
        {PESTANAS.map((p) => {
          const activa = filtroEstado === p.id
          return (
            <Pressable key={p.id || 'todas'} onPress={() => setFiltroEstado(p.id)} style={[st.pestana, activa && st.pestanaActiva]}
              accessibilityRole="tab" accessibilityState={{ selected: activa }}>
              <Text style={{ fontWeight: '700', color: activa ? C.white : C.gray700 }}>{p.texto}</Text>
              <View style={[st.pestanaN, activa && { backgroundColor: 'rgba(255,255,255,0.25)' }, !activa && p.id === 'bajo' && { backgroundColor: C.warn50 }]}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: activa ? C.white : p.id === 'bajo' ? C.warn700 : C.gray700 }}>{fmtNum(p.n)}</Text>
              </View>
            </Pressable>
          )
        })}
      </ScrollView>

      {/* Buscador y filtros */}
      <Entrada icono={Search} value={buscar} onChangeText={setBuscar} placeholder="Nombre, código, color o proveedor" autoCorrect={false} returnKeyType="search" />
      <View style={{ flexDirection: 'row', gap: S.sm, marginTop: S.sm }}>
        <View style={{ flex: 1 }}>
          <Selector valor={filtroProv} onCambio={setFiltroProv} icono={Truck} titulo="Proveedor" placeholder="Proveedor" buscable
            opciones={[{ valor: '', texto: 'Todos los proveedores' }, ...proveedores.map((p) => ({ valor: String(p.idProveedor), texto: p.nombre })), { valor: SIN_PROV, texto: 'Sin proveedor' }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Selector valor={filtroUbic} onCambio={setFiltroUbic} icono={MapPin} titulo="Ubicación" placeholder="Ubicación"
            opciones={[{ valor: '', texto: 'Todas las ubicaciones' }, ...ubicaciones.map((u) => ({ valor: String(u.idUbicacion), texto: u.nombre }))]} />
        </View>
      </View>
      <View style={st.resultados}>
        {!cargando && <Text style={T.chico}><Text style={{ fontWeight: '800', color: C.ink }}>{fmtNum(filtradas.length)}</Text> {filtradas.length === 1 ? 'tela' : 'telas'}{hayFiltros ? ` de ${fmtNum(telas.length)}` : ''}</Text>}
        {hayFiltros && <Boton chico variante="fantasma" icono={X} titulo="Limpiar filtros" onPress={limpiar} />}
      </View>

      {!!error && <Mensaje tipo="error">{error}</Mensaje>}
      {!!ok && <Mensaje tipo="ok">{ok}</Mensaje>}

      {/* Listado */}
      {cargando ? (
        [0, 1, 2].map((i) => <View key={i} style={[st.tela, { padding: S.lg, gap: 10 }]}><Esqueleto alto={18} ancho="60%" /><Esqueleto alto={14} ancho="40%" /><Esqueleto alto={40} /></View>)
      ) : telas.length === 0 && !error ? (
        <View style={st.tela}>
          <Vacio icono={Layers} titulo="Aún no hay telas registradas" accion={<Boton titulo="Ingresar mercancía" icono={PackagePlus} onPress={() => router.push('/ingreso')} />}>
            Registra tu primera tela y sus rollos para empezar.
          </Vacio>
        </View>
      ) : filtradas.length === 0 ? (
        <View style={st.tela}>
          <Vacio icono={SearchX} titulo="No se encontraron telas" accion={hayFiltros ? <Boton titulo="Limpiar filtros" icono={X} variante="secundario" onPress={limpiar} /> : null}>
            Prueba con otra búsqueda o quita alguno de los filtros.
          </Vacio>
        </View>
      ) : visibles.map((t) => {
        const open = abierta === t.idTela
        const estado = estadoStock(t)
        const det = detalles[t.idTela]
        const rollos = (det?.rollos || []).filter((r) => !filtroUbic || String(r.idUbicacion) === String(filtroUbic))
        const bod = Number(t.metrosBodega) || 0
        const loc = Number(t.metrosLocal) || 0
        const tot = bod + loc
        return (
          <View key={t.idTela} style={[st.tela, estado === 'bajo' && { borderLeftWidth: 3, borderLeftColor: C.warn700 }, estado === 'sin' && { borderLeftWidth: 3, borderLeftColor: C.gray400 }]}>
            <Pressable
              onPress={() => toggle(t.idTela)}
              style={({ pressed }) => [st.telaCab, (open || pressed) && { backgroundColor: C.gray50 }]}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={`${t.nombre}${t.color ? `, ${t.color}` : ''}, ${fmtMetros(t.metrosTotales)} en total. ${open ? 'Ocultar' : 'Ver'} rollos`}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {open ? <ChevronDown size={18} color={C.brand600} /> : <ChevronRight size={18} color={C.gray500} />}
                <Muestra color={t.color} />
                <View style={{ flex: 1 }}>
                  <Text style={st.telaNombre} numberOfLines={1}>{t.nombre}{!!t.color && <Text style={{ fontWeight: '500', color: C.inkSoft }}> · {t.color}</Text>}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={{ fontFamily: 'monospace', fontSize: 12.5, color: C.gray700 }}>{t.codigo}</Text>
                    <CodigoColorBadge codigo={t.codigoColor} />
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={st.telaTotal}>{fmtMetros(t.metrosTotales)}</Text>
                  <StockBadge estado={estado} />
                </View>
              </View>
              <View style={st.telaInfo}>
                <Truck size={12} color={C.gray500} strokeWidth={2} />
                <Text style={[T.mini, { flex: 1 }]} numberOfLines={1}>
                  {t.proveedor || 'Sin proveedor'}{t.diseno ? `  ·  ${t.diseno}` : ''}
                </Text>
              </View>
              <View style={st.cifras}>
                {[['Rollos', fmtNum(t.rollosDisponibles)], ['Bodega', fmtMetros(bod)], ['Local', fmtMetros(loc)]].map(([k, v]) => (
                  <View key={k} style={st.cifra}><Text style={st.cifraK}>{k}</Text><Text style={st.cifraV}>{v}</Text></View>
                ))}
                <Pressable onPress={() => abrirEdicion(t)} style={st.iconoBtn} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Editar ficha de ${t.nombre}`}>
                  <Pencil size={17} color={C.gray600} strokeWidth={1.9} />
                </Pressable>
                <Pressable
                  onPress={() => setMenu({ titulo: t.nombre, items: [
                    { texto: open ? 'Ocultar rollos' : 'Ver rollos', icono: Cylinder, onPress: () => toggle(t.idTela) },
                    { texto: 'Ver movimientos de la tela', icono: ClipboardList, onPress: () => router.push(`/reportes?tela=${t.idTela}`) },
                    { texto: 'Editar ficha', icono: Pencil, onPress: () => abrirEdicion(t) },
                  ] })}
                  style={st.iconoBtn} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Más acciones de ${t.nombre}`}
                >
                  <EllipsisVertical size={17} color={C.gray600} strokeWidth={1.9} />
                </Pressable>
              </View>
            </Pressable>

            {open && (
              <View style={{ borderTopWidth: 1, borderTopColor: C.gray200 }}>
                {/* Distribución Bodega / Local */}
                <View style={{ padding: S.md, gap: 8 }} accessibilityLabel={`Distribución: Bodega ${fmtMetros(bod)}, Local ${fmtMetros(loc)}`}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={st.fila}><Warehouse size={15} color={C.gray600} /><Text style={T.chico}>Bodega</Text><Text style={{ fontWeight: '800', color: C.ink }}>{fmtMetros(bod)}</Text></View>
                    <View style={st.fila}><Store size={15} color={C.brand600} /><Text style={T.chico}>Local</Text><Text style={{ fontWeight: '800', color: C.ink }}>{fmtMetros(loc)}</Text></View>
                  </View>
                  <View style={st.barra}>
                    {tot > 0 && <View style={{ flex: bod, backgroundColor: C.gray600 }} />}
                    {tot > 0 && <View style={{ flex: loc, backgroundColor: C.brand500 }} />}
                  </View>
                </View>

                {(!t.codigoColor || !t.proveedor) && (
                  <Pressable onPress={() => abrirEdicion(t)} style={st.avisoFicha} accessibilityRole="button">
                    <TriangleAlert size={14} color={C.warn700} />
                    <Text style={{ color: C.warn700, flex: 1, fontSize: 13 }}>
                      Falta {[!t.codigoColor && 'el código de color', !t.proveedor && 'el proveedor'].filter(Boolean).join(' y ')}. <Text style={{ fontWeight: '800', textDecorationLine: 'underline' }}>Completar ficha</Text>
                    </Text>
                  </Pressable>
                )}

                {det?.cargando && !rollos.length ? (
                  <View style={{ padding: S.md, gap: 8 }}><Esqueleto alto={70} /><Esqueleto alto={70} /></View>
                ) : det?.error ? (
                  <View style={{ padding: S.md }}><Mensaje tipo="error">{det.error}</Mensaje></View>
                ) : rollos.length === 0 ? (
                  <Vacio icono={Cylinder}>{filtroUbic ? `Sin rollos en ${nombreUbic}.` : 'Esta tela no tiene rollos registrados.'}</Vacio>
                ) : rollos.map((r) => {
                  const otras = ubicaciones.filter((u) => u.idUbicacion !== r.idUbicacion)
                  const destino = otras.length === 1 ? otras[0].nombre : null
                  const ini = Number(r.metrosIniciales) || 0
                  const pct = ini > 0 ? Math.max(0, Math.min(100, (Number(r.metrosActuales) / ini) * 100)) : 0
                  return (
                    <View key={r.idRollo} style={st.rollo}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <View>
                          <Text style={{ fontFamily: 'monospace', fontWeight: '700', color: C.ink, fontSize: 15 }}>{r.codigoBarras}</Text>
                          <Text style={T.mini}>Ingreso {fmtSoloFecha(r.fechaIngreso)}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <UbicacionBadge nombre={r.ubicacion} />
                          <EstadoBadge estado={r.estado} />
                        </View>
                      </View>
                      <View style={{ marginVertical: 10 }}>
                        <Text style={{ color: C.ink }}><Text style={{ fontWeight: '800', fontFamily: 'monospace' }}>{fmtMetros(r.metrosActuales)}</Text><Text style={{ color: C.inkFaint }}> de {fmtMetros(r.metrosIniciales)}</Text></Text>
                        <View style={st.metraje}><View style={{ width: `${pct}%`, backgroundColor: C.ok700, height: '100%', borderRadius: 5 }} /></View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {r.estado === 'Disponible' && (
                          <Boton chico titulo="Cortar" icono={Scissors} onPress={() => router.push(`/escanear?codigo=${encodeURIComponent(r.codigoBarras)}`)} style={{ flex: 1 }} accessibilityLabel={`Cortar el rollo ${r.codigoBarras}`} />
                        )}
                        {r.estado !== 'Anulado' && (
                          <Boton
                            chico variante="secundario" style={{ flex: 1.3 }}
                            icono={destino ? iconoUbicacion(destino) : ArrowLeftRight}
                            titulo={destino ? `Mover a ${destino}` : 'Trasladar'}
                            onPress={() => { setOk(''); setTraslado({ abierto: true, codigo: r.codigoBarras }) }}
                            accessibilityLabel={destino ? `Trasladar el rollo ${r.codigoBarras} a ${destino}` : `Trasladar el rollo ${r.codigoBarras}`}
                          />
                        )}
                        <Boton
                          chico variante="secundario" icono={EllipsisVertical}
                          accessibilityLabel={`Más acciones del rollo ${r.codigoBarras}`}
                          onPress={() => setMenu({ titulo: `Rollo ${r.codigoBarras}`, items: [
                            { texto: 'Ver historial del rollo', icono: History, onPress: () => router.push(`/reportes?rollo=${encodeURIComponent(r.codigoBarras)}`) },
                            { texto: 'Copiar código', icono: Copy, onPress: async () => { await Clipboard.setStringAsync(r.codigoBarras); setOk(`Código ${r.codigoBarras} copiado.`) } },
                          ] })}
                        />
                      </View>
                    </View>
                  )
                })}
              </View>
            )}
          </View>
        )
      })}

      {!cargando && visibles.length < filtradas.length && (
        <Boton titulo={`Mostrar más (${fmtNum(filtradas.length - visibles.length)} restantes)`} variante="secundario" onPress={() => setPagina((p) => p + 1)} bloque style={{ marginTop: S.sm }} />
      )}

      <TrasladoHoja
        visible={traslado.abierto}
        codigoInicial={traslado.codigo}
        ubicaciones={ubicaciones}
        onCerrar={() => setTraslado({ abierto: false, codigo: null })}
        onTrasladado={alTrasladar}
      />

      <MenuAcciones visible={!!menu} titulo={menu?.titulo || ''} items={menu?.items || []} onCerrar={() => setMenu(null)} />

      <Hoja
        visible={!!editando}
        titulo={editando ? `Ficha de ${editando.codigo}` : ''}
        icono={Pencil}
        onCerrar={() => !guardando && setEditando(null)}
        pie={(
          <>
            <Boton titulo="Cancelar" variante="secundario" onPress={() => setEditando(null)} deshabilitado={guardando} />
            <Boton titulo={guardando ? 'Guardando…' : 'Guardar cambios'} icono={Save} onPress={guardarFicha} cargando={guardando} style={{ flex: 1 }} />
          </>
        )}
      >
        {form && (
          <>
            {!!errFicha && <Mensaje tipo="error">{errFicha}</Mensaje>}
            <Campo etiqueta="Nombre de la tela" requerido error={errForm.nombre}>
              <Entrada icono={Layers} value={form.nombre} onChangeText={(v) => setForm({ ...form, nombre: v })} error={errForm.nombre} />
            </Campo>
            <Campo etiqueta="Código de color" error={errForm.codigoColor}>
              <Entrada icono={SwatchBook} value={form.codigoColor} onChangeText={(v) => setForm({ ...form, codigoColor: v.toUpperCase() })} placeholder="Ej. AZ-210" autoCapitalize="characters" maxLength={30} mono />
            </Campo>
            <Campo etiqueta="Color">
              <Entrada icono={Palette} value={form.color} onChangeText={(v) => setForm({ ...form, color: v })} placeholder="Ej. Azul marino" />
            </Campo>
            <Campo etiqueta="Diseño">
              <Entrada icono={Shapes} value={form.diseno} onChangeText={(v) => setForm({ ...form, diseno: v })} placeholder="Ej. Liso" />
            </Campo>
            <ProveedorCampo
              proveedores={proveedores}
              valor={form.idProveedor}
              onCambio={(v) => setForm((f) => ({ ...f, idProveedor: v }))}
              onCreado={(p) => setProveedores((ps) => [...ps, p].sort((a, b) => a.nombre.localeCompare(b.nombre)))}
            />
            <Campo etiqueta="Stock mínimo (m)" requerido error={errForm.stockMinimo}>
              <Entrada icono={Gauge} value={form.stockMinimo} onChangeText={(v) => setForm({ ...form, stockMinimo: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" />
            </Campo>
          </>
        )}
      </Hoja>
    </Pantalla>
  )
}

const st = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  kpi: { width: '48.6%', backgroundColor: C.white, borderRadius: R.md, borderWidth: 1, borderColor: C.gray200, padding: S.md, gap: 2 },
  kpiValor: { fontSize: 22, fontWeight: '800', color: C.ink },
  pestana: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.white, borderWidth: 1, borderColor: C.gray300 },
  pestanaActiva: { backgroundColor: C.brand600, borderColor: C.brand600 },
  pestanaN: { minWidth: 22, paddingHorizontal: 6, borderRadius: 999, backgroundColor: C.gray100, alignItems: 'center' },
  resultados: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40, marginVertical: 4 },
  tela: { backgroundColor: C.white, borderRadius: R.md, borderWidth: 1, borderColor: C.gray200, marginBottom: S.sm, overflow: 'hidden' },
  telaCab: { padding: S.md, gap: 8 },
  telaNombre: { fontSize: 16, fontWeight: '800', color: C.ink },
  telaTotal: { fontSize: 17, fontWeight: '800', color: C.ink },
  telaInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 28 + 22 },
  cifras: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 28 },
  cifra: { flex: 1, backgroundColor: C.gray50, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8 },
  cifraK: { fontSize: 10.5, fontWeight: '700', color: C.inkFaint, textTransform: 'uppercase' },
  cifraV: { fontSize: 14, fontWeight: '600', color: C.gray700 },
  iconoBtn: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  muestra: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  muestraVacia: { backgroundColor: C.gray100, borderColor: C.gray300, borderStyle: 'dashed' },
  barra: { flexDirection: 'row', height: 8, borderRadius: 8, overflow: 'hidden', backgroundColor: C.gray100 },
  avisoFicha: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: S.md, paddingVertical: 10, backgroundColor: C.warn50, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.warn200 },
  rollo: { padding: S.md, borderTopWidth: 1, borderTopColor: C.gray100 },
  metraje: { height: 5, borderRadius: 5, backgroundColor: C.gray200, overflow: 'hidden', marginTop: 6, width: '60%' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.gray100 },
})
