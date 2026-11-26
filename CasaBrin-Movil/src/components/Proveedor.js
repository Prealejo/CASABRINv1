import { useState } from 'react'
import { View } from 'react-native'
import { Truck, Plus, Check, X } from 'lucide-react-native'
import { api } from '../api/client'
import { Campo, Entrada, Selector } from './campos'
import { Boton } from './ui'
import { S } from '../theme'

/** Selector de proveedor con alta rápida: «Nuevo» lo crea y lo deja seleccionado (igual que la web). */
export default function ProveedorCampo({ proveedores, valor, onCambio, onCreado }) {
  const [creando, setCreando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function guardar() {
    const n = nombre.trim()
    if (!n) { setError('Escribe el nombre del proveedor.'); return }
    const existe = proveedores.find((p) => p.nombre.toLowerCase() === n.toLowerCase())
    if (existe) { onCambio(String(existe.idProveedor)); setCreando(false); setNombre(''); return }
    setGuardando(true); setError('')
    try {
      const { data } = await api.post('/catalogos/proveedores', { nombre: n })
      onCreado?.(data)
      onCambio(String(data.idProveedor))
      setCreando(false); setNombre('')
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  if (creando) {
    return (
      <View>
        <Campo etiqueta="Nuevo proveedor" error={error} style={{ marginBottom: S.sm }}>
          <Entrada icono={Truck} value={nombre} onChangeText={(t) => { setNombre(t); setError('') }} placeholder="Nombre del proveedor" autoFocus onSubmitEditing={guardar} />
        </Campo>
        <View style={{ flexDirection: 'row', gap: S.sm, marginBottom: S.lg }}>
          <Boton chico titulo={guardando ? 'Guardando…' : 'Guardar'} icono={Check} onPress={guardar} cargando={guardando} style={{ flex: 1 }} />
          <Boton chico titulo="Cancelar" icono={X} variante="secundario" onPress={() => { setCreando(false); setNombre(''); setError('') }} style={{ flex: 1 }} />
        </View>
      </View>
    )
  }

  return (
    <Campo etiqueta="Proveedor">
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <View style={{ flex: 1 }}>
          <Selector
            valor={valor}
            onCambio={onCambio}
            icono={Truck}
            titulo="Proveedor"
            placeholder="Sin proveedor"
            buscable
            opciones={[{ valor: '', texto: 'Sin proveedor' }, ...proveedores.map((p) => ({ valor: String(p.idProveedor), texto: p.nombre }))]}
          />
        </View>
        <Boton icono={Plus} titulo="Nuevo" variante="secundario" onPress={() => setCreando(true)} accessibilityLabel="Agregar un proveedor nuevo" />
      </View>
    </Campo>
  )
}
