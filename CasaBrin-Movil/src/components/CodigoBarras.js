import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Text, View } from 'react-native'
import { barcodeDataUri } from '../api/client'
import { C } from '../theme'

// Caché en memoria: cada código de barras se descarga una sola vez por sesión.
const cache = new Map()

/**
 * Imagen del código de barras de un rollo (la genera el backend, RF-05).
 * Se descarga con el token y se muestra como data URI: la cabecera Authorization
 * en <Image source={{ headers }}> no es confiable en todas las versiones de Android.
 */
export default function CodigoBarras({ idRollo, codigo, alto = 80 }) {
  const [uri, setUri] = useState(() => cache.get(idRollo) || null)
  const [fallo, setFallo] = useState(false)

  useEffect(() => {
    if (cache.has(idRollo)) return undefined
    let vivo = true
    barcodeDataUri(idRollo)
      .then((u) => { cache.set(idRollo, u); if (vivo) setUri(u) })
      .catch(() => { if (vivo) setFallo(true) })
    return () => { vivo = false }
  }, [idRollo])

  if (fallo) {
    return <Text style={{ color: C.inkFaint, height: alto, textAlignVertical: 'center' }}>No se pudo cargar el código de barras.</Text>
  }
  if (!uri) {
    return <View style={{ height: alto, justifyContent: 'center' }}><ActivityIndicator color={C.gray400} /></View>
  }
  return (
    <Image
      source={{ uri }}
      style={{ width: '100%', height: alto }}
      resizeMode="contain"
      accessibilityLabel={`Código de barras ${codigo}`}
    />
  )
}
