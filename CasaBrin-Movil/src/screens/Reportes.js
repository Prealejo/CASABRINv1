import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { File, Paths } from 'expo-file-system'
import {
  TriangleAlert, CircleCheck, History, List, Filter, RotateCcw, SearchX, Barcode,
  Layers, Download, Printer, X, Route, Ruler, Scissors, Calendar, Cylinder, Camera,
} from 'lucide-react-native'
import { api } from '../api/client'
import { fmtMetros, fmtNum, fmtFecha, fmtSoloFecha, rangoUtc } from '../lib/format'
import Pantalla from '../components/Pantalla'
import { EscanerCamara } from '../components/Escaner'
import { Campo, Entrada, Selector, SelectorFecha } from '../components/campos'
import {
  Boton, Cargando, CodigoColorBadge, EstadoBadge, Mensaje, ProveedorTexto, Seccion, Tarjeta, TipoMovimiento,
  UbicacionBadge, Vacio, Paginacion,
} from '../components/ui'
import { C, R, S, T } from '../theme'

const TIPOS = ['Ingreso', 'Traslado', 'Salida', 'Ajuste', 'Anulacion']
const PAGE = 7   // movimientos por página
const VACIOS = { tipo: '', idTela: '', rollo: '', desde: '', hasta: '' }
const csvCelda = (v) => { const s = v == null ? '' : String(v); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
const num = (v) => (Number(v) || 0).toLocaleString('es-EC', { maximumFractionDigits: 2, useGrouping: false })
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

export default function Reportes() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const inicial = { ...VACIOS, rollo: params.rollo ? String(params.rollo) : '', idTela: params.tela ? String(params.tela) : '', tipo: params.tipo ? String(params.tipo) : '' }
  const [alertas, setAlertas] = useState([])
  const [telas, setTelas] = useState([])
  const [filtros, setFiltros] = useState(inicial)
  const [aplicados, setAplicados] = useState(inicial)
  const [rollo, setRollo] = useState(null)
  const [movs, setMovs] = useState({ items: [], total: 0 })
  const [resumen, setResumen] = useState(null)
  const [page, setPage] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [exportando, setExportando] = useState(false)
  const [error, setError] = useState('')
  const [camara, setCamara] = useState(false)
  const [verFiltros, setVerFiltros] = useState(!inicial.rollo)

  useEffect(() => {
    ;(async () => {
      try {
        const [a, t] = await Promise.all([api.get('/reportes/alertas'), api.get('/telas')])
        setAlertas(a.data); setTelas(t.data)
      } catch (e) { setError(e.message) }
    })()
  }, [])

  // Si se llega con otros parámetros (p. ej. desde Inventario o el Panel), se aplican.
  const claveParams = `${params.rollo || ''}|${params.tela || ''}|${params.tipo || ''}`
  const [claveAnterior, setClaveAnterior] = useState(claveParams)
  if (claveParams !== claveAnterior) {
    const f = { ...VACIOS, rollo: params.rollo ? String(params.rollo) : '', idTela: params.tela ? String(params.tela) : '', tipo: params.tipo ? String(params.tipo) : '' }
    setClaveAnterior(claveParams); setFiltros(f); setAplicados(f); setPage(1)
  }

  const paramsApi = useCallback(async (f) => {
    let info = null
    let idRollo
    if (f.rollo) {
      const { data } = await api.get(`/rollos/codigo/${encodeURIComponent(f.rollo.trim().toUpperCase())}`)
      info = data; idRollo = data.idRollo
    }
    const { desde, hasta } = rangoUtc(f.desde, f.hasta)
    return { info, params: { tipo: f.tipo || undefined, idTela: f.idTela || undefined, idRollo, desde, hasta, orden: idRollo ? 'asc' : undefined } }
  }, [])

  useEffect(() => {
    let vivo = true
    ;(async () => {
      setCargando(true); setError('')
      try {
        const { info, params: p } = await paramsApi(aplicados)
        const [lista, res] = await Promise.all([
          api.get('/reportes/movimientos', { params: { ...p, page, pageSize: PAGE } }),
          api.get('/reportes/movimientos/resumen', { params: { ...p, orden: undefined } }),
        ])
        if (!vivo) return
        setRollo(info); setMovs(lista.data); setResumen(res.data)
      } catch (e) {
        if (!vivo) return
        setRollo(null); setMovs({ items: [], total: 0 }); setResumen(null)
        setError(aplicados.rollo ? `No se encontró el rollo «${aplicados.rollo}». ${e.message}` : e.message)
      } finally { if (vivo) setCargando(false) }
    })()
    return () => { vivo = false }
  }, [aplicados, page, paramsApi])

  function aplicar(f = filtros) { setAplicados({ ...f }); setPage(1) }
  function limpiar() { setFiltros(VACIOS); setAplicados(VACIOS); setPage(1); router.setParams({ rollo: undefined, tela: undefined, tipo: undefined }) }
  function verRollo(codigo) { const f = { ...VACIOS, rollo: codigo }; setFiltros(f); aplicar(f) }

  const porTipo = useMemo(() => Object.fromEntries((resumen?.porTipo || []).map((r) => [r.tipo, r])), [resumen])
  const hayFiltros = Object.values(aplicados).some(Boolean)
  const nombreTela = telas.find((t) => String(t.idTela) === String(aplicados.idTela))
  const descripcion = [
    aplicados.rollo && `Rollo ${aplicados.rollo}`,
    nombreTela && `Tela ${nombreTela.codigo} · ${nombreTela.nombre}`,
    aplicados.tipo && `Tipo ${aplicados.tipo}`,
    aplicados.desde && `Desde ${aplicados.desde}`,
    aplicados.hasta && `Hasta ${aplicados.hasta}`,
  ].filter(Boolean).join(' · ') || 'Todos los movimientos'

  async function todasLasFilas() {
    const { params: p } = await paramsApi(aplicados)
    const filas = []
    let pag = 1
    let total = 0
    do {
      const { data } = await api.get('/reportes/movimientos', { params: { ...p, page: pag, pageSize: 200 } })
      filas.push(...data.items); total = data.total; pag++
    } while (filas.length < total && pag < 500)
    return filas
  }

  // Exporta TODOS los movimientos del filtro a CSV y abre «Compartir» (WhatsApp, Drive, correo…).
  async function exportar() {
    setExportando(true); setError('')
    try {
      const filas = await todasLasFilas()
      const cab = ['Fecha', 'Tipo', 'Código tela', 'Tela', 'Código rollo', 'Metros', 'Metros antes', 'Metros después', 'Origen', 'Destino', 'Usuario', 'Observación']
      const lineas = filas.map((m) => [fmtFecha(m.fecha), m.tipo, m.codigoTela, m.tela, m.codigoBarras, num(m.metros), num(m.metrosAntes),
        num(m.metrosDespues), m.ubicacionOrigen || '', m.ubicacionDestino || '', m.usuario, m.observacion || ''].map(csvCelda).join(';'))
      const contenido = '﻿' + [`Reporte de movimientos Casa Brin;${csvCelda(descripcion)}`, cab.join(';'), ...lineas].join('\r\n')
      const hoy = new Date()
      const nombre = `movimientos-casabrin-${aplicados.rollo ? `rollo-${aplicados.rollo}` : `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`}.csv`
      const archivo = new File(Paths.cache, nombre)
      if (archivo.exists) archivo.delete()
      archivo.create()
      await archivo.write(contenido)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(archivo.uri, { mimeType: 'text/csv', dialogTitle: 'Compartir reporte de movimientos' })
      } else {
        setError('Este dispositivo no permite compartir archivos.')
      }
    } catch (e) { setError(e.message) } finally { setExportando(false) }
  }

  async function imprimir() {
    setExportando(true); setError('')
    try {
      const filas = await todasLasFilas()
      const tr = filas.map((m) => `<tr><td>${esc(fmtFecha(m.fecha))}</td><td>${esc(m.tipo)}</td><td>${esc(m.tela)}</td><td>${esc(m.codigoBarras)}</td>
        <td style="text-align:right">${esc(fmtMetros(m.metros))}</td><td>${esc(m.ubicacionOrigen && m.ubicacionDestino ? `${m.ubicacionOrigen} → ${m.ubicacionDestino}` : (m.ubicacionDestino || m.ubicacionOrigen || '—'))}</td>
        <td>${esc(m.usuario)}</td><td>${esc(m.observacion || '')}</td></tr>`).join('')
      await Print.printAsync({ html: `<html><head><meta charset="utf-8"/><style>
        body{font-family:Arial,sans-serif;font-size:11px;margin:16px}h2{margin:0 0 4px}
        table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ddd;padding:4px;text-align:left}th{background:#f3f4f6}
        </style></head><body><h2>Casa Brin — Reporte de movimientos</h2><p>${esc(descripcion)}<br/>Generado: ${esc(fmtFecha(new Date().toISOString()))}</p>
        <table><thead><tr><th>Fecha</th><th>Tipo</th><th>Tela</th><th>Rollo</th><th>Metros</th><th>Ubicación</th><th>Usuario</th><th>Observación</th></tr></thead><tbody>${tr}</tbody></table></body></html>` })
    } catch (e) { setError(e.message) } finally { setExportando(false) }
  }

  const cortado = rollo ? Math.max(0, Number(rollo.metrosIniciales) - Number(rollo.metrosActuales)) : 0

  return (
    <Pantalla
      titulo="Movimientos y reporte"
      subtitulo="Trazabilidad de cada rollo: ingreso, traslados, cortes y ajustes."
      acciones={(
        <>
          <Boton titulo="Exportar CSV" icono={Download} onPress={exportar} cargando={exportando} deshabilitado={!movs.total} style={{ flex: 1 }} />
          <Boton titulo="Imprimir" icono={Printer} variante="secundario" onPress={imprimir} deshabilitado={!movs.total || exportando} style={{ flex: 1 }} />
        </>
      )}
    >
      {!!error && <Mensaje tipo="error">{error}</Mensaje>}

      {!aplicados.rollo && (
        <Seccion titulo="Alertas de stock bajo" icono={TriangleAlert} style={{ marginTop: 0 }}>
          <Tarjeta style={{ padding: 0 }}>
            {alertas.length === 0 ? <Vacio icono={CircleCheck} titulo="Sin alertas">Ninguna tela está por debajo de su stock mínimo.</Vacio> : alertas.map((a, i) => (
              <View key={a.idTela} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: S.md, borderTopWidth: i ? 1 : 0, borderTopColor: C.gray100 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: C.ink }}>{a.nombre}</Text>
                  <Text style={T.mini}>{a.codigo} · mínimo {fmtMetros(a.stockMinimo)} · {fmtNum(a.rollosDisponibles)} rollos</Text>
                </View>
                <Text style={{ fontWeight: '800', color: C.warn700, fontFamily: 'monospace' }}>{fmtMetros(a.metrosTotales)}</Text>
              </View>
            ))}
          </Tarjeta>
        </Seccion>
      )}

      <Seccion
        titulo="Historial de movimientos"
        icono={History}
        accion={<Boton chico variante="fantasma" icono={Filter} titulo={verFiltros ? 'Ocultar filtros' : 'Filtros'} onPress={() => setVerFiltros((v) => !v)} />}
        style={aplicados.rollo ? { marginTop: S.sm } : undefined}
      >
        {verFiltros && (
          <Tarjeta style={{ marginBottom: S.md }}>
            <Campo etiqueta="Código de rollo">
              <Entrada
                icono={Barcode} value={filtros.rollo} onChangeText={(v) => setFiltros({ ...filtros, rollo: v.toUpperCase() })}
                placeholder="Escanea o escribe" autoCapitalize="characters" autoCorrect={false} mono
                derecha={(
                  <Pressable onPress={() => setCamara(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Escanear con la cámara">
                    <Camera size={20} color={C.gray600} strokeWidth={1.9} />
                  </Pressable>
                )}
              />
            </Campo>
            <Campo etiqueta="Tela">
              <Selector valor={filtros.idTela} onCambio={(v) => setFiltros({ ...filtros, idTela: v })} icono={Layers} titulo="Tela" buscable
                opciones={[{ valor: '', texto: 'Todas' }, ...telas.map((t) => ({ valor: String(t.idTela), texto: `${t.codigo} · ${t.nombre}`, detalle: t.codigoColor ? `Color ${t.codigoColor}` : undefined }))]} />
            </Campo>
            <Campo etiqueta="Tipo">
              <Selector valor={filtros.tipo} onCambio={(v) => setFiltros({ ...filtros, tipo: v })} icono={List} titulo="Tipo de movimiento"
                opciones={[{ valor: '', texto: 'Todos' }, ...TIPOS.map((t) => ({ valor: t, texto: t }))]} />
            </Campo>
            <View style={{ flexDirection: 'row', gap: S.sm }}>
              <Campo etiqueta="Desde" style={{ flex: 1 }}><SelectorFecha valor={filtros.desde} onCambio={(v) => setFiltros({ ...filtros, desde: v })} placeholder="Desde" /></Campo>
              <Campo etiqueta="Hasta" style={{ flex: 1 }}><SelectorFecha valor={filtros.hasta} minimo={filtros.desde} onCambio={(v) => setFiltros({ ...filtros, hasta: v })} placeholder="Hasta" /></Campo>
            </View>
            <View style={{ flexDirection: 'row', gap: S.sm }}>
              <Boton titulo="Filtrar" icono={Filter} onPress={() => aplicar()} style={{ flex: 1 }} />
              <Boton titulo="Limpiar" icono={RotateCcw} variante="secundario" onPress={limpiar} deshabilitado={!hayFiltros && !Object.values(filtros).some(Boolean)} style={{ flex: 1 }} />
            </View>
          </Tarjeta>
        )}

        {rollo && (
          <Tarjeta borde={C.brand600} style={{ marginBottom: S.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Route size={18} color={C.brand600} /><Text style={T.seccion}>Trazabilidad del rollo</Text></View>
              <Boton chico variante="fantasma" icono={X} titulo="Quitar" onPress={limpiar} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '800', color: C.ink }}>{rollo.telaNombre}{rollo.color ? ` · ${rollo.color}` : ''}</Text>
            <Text style={{ fontFamily: 'monospace', color: C.gray700, marginBottom: 6 }}>{rollo.codigoBarras}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: S.md }}>
              <CodigoColorBadge codigo={rollo.codigoColor} />
              <EstadoBadge estado={rollo.estado} />
              <UbicacionBadge nombre={rollo.ubicacion} />
              <ProveedorTexto nombre={rollo.proveedor} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: C.gray50, borderRadius: R.sm, borderWidth: 1, borderColor: C.gray200, padding: S.sm }}>
              {[[Calendar, 'Ingreso', fmtSoloFecha(rollo.fechaIngreso)], [Ruler, 'Iniciales', fmtMetros(rollo.metrosIniciales)],
                [Scissors, 'Cortado', fmtMetros(cortado)], [Cylinder, 'Saldo', fmtMetros(rollo.metrosActuales)]].map(([Ico, k, v], i) => (
                <View key={k} style={{ width: '50%', padding: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ico size={13} color={C.inkSoft} /><Text style={T.mini}>{k}</Text></View>
                  <Text style={{ fontWeight: '800', fontSize: 16, color: i === 3 ? C.brand700 : C.ink }}>{v}</Text>
                </View>
              ))}
            </View>
          </Tarjeta>
        )}

        {resumen?.total > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.md }}>
            {TIPOS.filter((t) => porTipo[t]).map((t) => (
              <View key={t} style={{ flexGrow: 1, minWidth: '30%', backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200, borderRadius: R.sm, padding: S.sm, gap: 4 }}>
                <TipoMovimiento tipo={t} />
                <Text style={{ fontSize: 20, fontWeight: '800', color: C.ink }}>{fmtNum(porTipo[t].cantidad)}</Text>
                <Text style={T.mini}>{fmtMetros(porTipo[t].metros)}</Text>
              </View>
            ))}
          </View>
        )}

        <Tarjeta style={{ padding: 0 }}>
          {cargando ? <Cargando texto="Cargando movimientos…" /> : movs.items.length === 0 ? (
            <Vacio icono={SearchX} titulo="Sin resultados">{hayFiltros ? 'No hay movimientos con esos filtros.' : 'Aún no hay movimientos registrados.'}</Vacio>
          ) : movs.items.map((m, i) => (
            <View key={m.idMovimiento} style={{ padding: S.md, borderTopWidth: i ? 1 : 0, borderTopColor: C.gray100, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {rollo && <Text style={[T.mini, { width: 18 }]}>{(page - 1) * PAGE + i + 1}</Text>}
                  <TipoMovimiento tipo={m.tipo} />
                </View>
                <Text style={{ fontWeight: '800', fontFamily: 'monospace', color: C.ink }}>{fmtMetros(m.metros)}</Text>
              </View>
              {!rollo && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontWeight: '600', color: C.ink, flexShrink: 1 }} numberOfLines={1}>{m.tela}</Text>
                  <Pressable onPress={() => verRollo(m.codigoBarras)} hitSlop={6} accessibilityRole="link" accessibilityLabel={`Ver trazabilidad del rollo ${m.codigoBarras}`}>
                    <Text style={{ fontFamily: 'monospace', color: C.brand700, textDecorationLine: 'underline' }}>{m.codigoBarras}</Text>
                  </Pressable>
                </View>
              )}
              <Text style={T.mini}>
                {fmtFecha(m.fecha)} · {fmtMetros(m.metrosAntes)} → {fmtMetros(m.metrosDespues)} · {m.ubicacionOrigen && m.ubicacionDestino ? `${m.ubicacionOrigen} → ${m.ubicacionDestino}` : (m.ubicacionDestino || m.ubicacionOrigen || '—')}
              </Text>
              <Text style={T.mini}>{m.usuario}{m.observacion ? ` · ${m.observacion}` : ''}</Text>
            </View>
          ))}
        </Tarjeta>

        <Paginacion pagina={page} total={movs.total} porPagina={PAGE} onCambiar={setPage} unidad="movimientos" />
      </Seccion>

      <EscanerCamara visible={camara} onCerrar={() => setCamara(false)} onCodigo={(c) => { setCamara(false); verRollo(c) }} />
    </Pantalla>
  )
}
