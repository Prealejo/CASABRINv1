import { useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { ScanBarcode, Search, X, Camera } from 'lucide-react-native'
import { C, R, S, T } from '../theme'
import { Boton } from './ui'
import { Entrada } from './campos'

/**
 * Escáner de códigos de barras con la cámara (Code128, el formato de las etiquetas de Casa Brin).
 * Se monta solo mientras está abierto: Expo permite una vista de cámara activa a la vez.
 */
export function EscanerCamara({ visible, onCodigo, onCerrar }) {
  const [permiso, pedirPermiso] = useCameraPermissions()
  const leido = useRef(false)

  function alLeer({ data }) {
    if (leido.current || !data) return   // evita lecturas repetidas del mismo código
    leido.current = true
    onCodigo(String(data).trim())
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCerrar} onShow={() => { leido.current = false }}>
      <View style={st.pantalla}>
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
              barcodeScannerSettings={{ barcodeTypes: ['code128', 'code39', 'ean13', 'qr'] }}
              onBarcodeScanned={alLeer}
            />
            <View style={st.marco} pointerEvents="none">
              <View style={st.ventana} />
              <Text style={st.guia}>Apunta al código de barras de la etiqueta</Text>
            </View>
          </>
        )}
        <Pressable onPress={onCerrar} style={st.cerrar} accessibilityRole="button" accessibilityLabel="Cerrar escáner" hitSlop={10}>
          <X size={26} color={C.white} />
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
  marco: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: S.lg },
  ventana: { width: '80%', height: 160, borderWidth: 3, borderColor: C.white, borderRadius: R.lg, backgroundColor: 'transparent' },
  guia: { color: C.white, fontSize: 15, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  cerrar: { position: 'absolute', top: 48, right: 20, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
})
