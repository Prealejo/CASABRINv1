import { useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, Vibration, View } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { ScanBarcode, Search, X, Camera } from 'lucide-react-native'
import { C, R, S, T } from '../theme'
import { Boton } from './ui'
import { Entrada } from './campos'

// Códigos de rollo que genera Casa Brin: CB + dígitos (p. ej. CB00000004).
const PATRON_ROLLO = /^CB\d{8,}$/
const LECTURAS_IGUALES = 3      // lecturas consecutivas del mismo código antes de aceptarlo
const VENTANA_MS = 1500         // si pasa más tiempo entre lecturas, se empieza de nuevo
const PAUSA_CONFIRMACION = 600  // tiempo que se muestra el código detectado antes de buscar

const COLORES = { buscando: C.white, leyendo: '#f59e0b', detectado: '#22c55e' }
const ANCHO_RECUADRO = 0.85     // fracción del ancho de pantalla
const ALTO_RECUADRO = 170       // alto del recuadro guía (dp)

/**
 * Escáner con la cámara (Code128, el formato de las etiquetas de Casa Brin).
 * Para evitar lecturas equivocadas solo acepta un código cuando:
 *  - tiene el formato de un rollo (CB + dígitos),
 *  - está centrado dentro del recuadro guía,
 *  - se leyó igual varias veces seguidas (lectura estable).
 * Se monta solo mientras está abierto: Expo permite una vista de cámara activa a la vez.
 */
export function EscanerCamara({ visible, onCodigo, onCerrar }) {
  const [permiso, pedirPermiso] = useCameraPermissions()
  const [estado, setEstado] = useState({ fase: 'buscando', codigo: '' })
  const bloqueado = useRef(false)
  const candidato = useRef({ codigo: '', veces: 0, t: 0 })
  const ventana = useRef(null)   // { x, y, width, height } del recuadro guía
  const vista = useRef(null)     // { width, height } de la vista de cámara
  const temporizador = useRef(null)

  function cerrar() {
    clearTimeout(temporizador.current)   // si se cierra durante la confirmación, no se busca
    onCerrar()
  }

  function reiniciar() {
    bloqueado.current = false
    candidato.current = { codigo: '', veces: 0, t: 0 }
    setEstado({ fase: 'buscando', codigo: '' })
  }

  // ¿El centro del código cae dentro del recuadro? (si la cámara no informa
  // la posición, se acepta igual y manda la estabilidad de la lectura)
  function estaCentrado(bounds) {
    const v = ventana.current
    const w = bounds?.size?.width
    const h = bounds?.size?.height
    if (!v || !w || !h) return true
    const cx = bounds.origin.x + w / 2
    const cy = bounds.origin.y + h / 2
    // Si la posición viene en otra escala (fuera de la vista), no se puede comparar:
    // se acepta y decide la estabilidad de la lectura.
    const vw = vista.current?.width
    const vh = vista.current?.height
    if (vw && vh && (cx < 0 || cy < 0 || cx > vw || cy > vh)) return true
    return cx >= v.x && cx <= v.x + v.width && cy >= v.y && cy <= v.y + v.height
  }

  function alLeer({ data, bounds }) {
    if (bloqueado.current || !data) return
    const codigo = String(data).trim().toUpperCase()
    if (!PATRON_ROLLO.test(codigo) || !estaCentrado(bounds)) return

    const ahora = Date.now()
    const c = candidato.current
    if (c.codigo === codigo && ahora - c.t <= VENTANA_MS) {
      c.veces += 1
      c.t = ahora
    } else {
      candidato.current = { codigo, veces: 1, t: ahora }
      setEstado({ fase: 'leyendo', codigo })
    }

    if (candidato.current.veces >= LECTURAS_IGUALES) {
      bloqueado.current = true
      setEstado({ fase: 'detectado', codigo })
      Vibration.vibrate(80)
      temporizador.current = setTimeout(() => onCodigo(codigo), PAUSA_CONFIRMACION)
    }
  }

  const color = COLORES[estado.fase]
  const mensaje = estado.fase === 'detectado'
    ? `Código detectado: ${estado.codigo}`
    : estado.fase === 'leyendo'
      ? `Mantén quieto… ${estado.codigo}`
      : 'Centra el código de barras dentro del recuadro'

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={cerrar}
      onShow={reiniciar}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View
        style={st.pantalla}
        onLayout={(e) => {
          // El recuadro queda centrado exactamente en la vista de cámara: su posición
          // se calcula aquí para comprobar si el código leído cae dentro de él.
          const { width, height } = e.nativeEvent.layout
          vista.current = { width, height }
          const w = width * ANCHO_RECUADRO
          ventana.current = { x: (width - w) / 2, y: (height - ALTO_RECUADRO) / 2, width: w, height: ALTO_RECUADRO }
        }}
      >
        {!permiso ? null : !permiso.granted ? (
          <View style={st.permiso}>
            <Camera size={40} color={C.white} strokeWidth={1.5} />
            <Text style={st.permisoTxt}>Casa Brin necesita permiso para usar la cámara y leer el código de barras de los rollos.</Text>
            <Boton titulo="Permitir cámara" icono={Camera} onPress={pedirPermiso} />
          </View>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['code128'] }}
              onBarcodeScanned={alLeer}
            />
            {/* Máscara: oscurece todo menos el recuadro, que queda en el centro exacto */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <View style={st.sombra} />
              <View style={{ flexDirection: 'row', height: ALTO_RECUADRO }}>
                <View style={st.sombra} />
                <View style={[st.ventana, { width: `${ANCHO_RECUADRO * 100}%`, borderColor: color }]}>
                  {estado.fase !== 'buscando' && <View style={[st.linea, { backgroundColor: color }]} />}
                </View>
                <View style={st.sombra} />
              </View>
              <View style={[st.sombra, st.zonaMensaje]}>
                <Text style={[st.guia, estado.fase === 'detectado' && st.guiaOk]} accessibilityLiveRegion="polite">
                  {mensaje}
                </Text>
              </View>
            </View>
          </>
        )}
        <Pressable onPress={cerrar} style={st.cerrar} accessibilityRole="button" accessibilityLabel="Cerrar escáner" hitSlop={10}>
          <X size={26} color={C.white} />
        </Pressable>
        <Pressable onPress={cerrar} style={st.cancelar} accessibilityRole="button" accessibilityLabel="Cancelar escaneo">
          <Text style={st.cancelarTxt}>Cancelar</Text>
        </Pressable>
      </View>
    </Modal>
  )
}

/**
 * Campo de código de rollo: escribir a mano + botón de cámara + «Buscar».
 * Equivale al BarcodeInput de la web (allí la pistola lectora escribe el código).
 */
export function CampoCodigo({ onBuscar, etiqueta = 'Código de barras del rollo', autoFocus = false, cargando = false }) {
  const [valor, setValor] = useState('')
  const [camara, setCamara] = useState(false)

  function buscar(cod = valor) {
    const c = (cod || '').trim().toUpperCase()
    if (!c) return
    onBuscar(c)
    setValor('')
  }

  return (
    <View>
      <Text style={[T.etiqueta, { marginBottom: 6 }]}>{etiqueta}</Text>
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <View style={{ flex: 1 }}>
          <Entrada
            icono={ScanBarcode}
            value={valor}
            onChangeText={setValor}
            placeholder="Escribe o escanea"
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus={autoFocus}
            returnKeyType="search"
            onSubmitEditing={() => buscar()}
            mono
            accessibilityLabel={etiqueta}
          />
        </View>
        <Boton icono={Camera} variante="secundario" onPress={() => setCamara(true)} accessibilityLabel="Escanear con la cámara" />
      </View>
      <Boton titulo="Buscar" icono={Search} onPress={() => buscar()} cargando={cargando} style={{ marginTop: S.sm }} bloque />
      <Text style={[T.mini, { marginTop: 6 }]}>Toca la cámara para escanear la etiqueta o escribe el código.</Text>

      <EscanerCamara
        visible={camara}
        onCerrar={() => setCamara(false)}
        onCodigo={(c) => { setCamara(false); buscar(c) }}
      />
    </View>
  )
}

const st = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#000' },
  permiso: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: S.lg, padding: S.xl },
  permisoTxt: { color: C.white, textAlign: 'center', fontSize: 16, lineHeight: 22 },
  sombra: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  ventana: { height: '100%', borderWidth: 3, borderColor: C.white, borderRadius: R.md, backgroundColor: 'transparent', justifyContent: 'center' },
  zonaMensaje: { alignItems: 'center', paddingTop: S.xl },
  linea: { height: 2, marginHorizontal: 12, opacity: 0.85 },
  guia: { color: C.white, fontSize: 15, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, textAlign: 'center', marginHorizontal: 24 },
  guiaOk: { backgroundColor: 'rgba(21,128,61,0.9)' },
  cancelar: {
    position: 'absolute', bottom: 48, alignSelf: 'center', paddingHorizontal: 36, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center',
  },
  cancelarTxt: { color: C.ink, fontWeight: '800', fontSize: 16 },
  cerrar: { position: 'absolute', top: 48, right: 20, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
})
