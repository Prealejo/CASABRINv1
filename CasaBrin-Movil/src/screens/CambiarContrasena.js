import { useState } from 'react'
import { Text } from 'react-native'
import { Lock, ShieldCheck, LogOut } from 'lucide-react-native'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { AccesoLayout } from '../components/Acceso'
import { Campo, EntradaClave, FuerzaContrasena } from '../components/campos'
import { Boton, Mensaje } from '../components/ui'
import { errorContrasena } from '../lib/contrasena'
import { S, T } from '../theme'

/** Cambio obligatorio después de recibir una contraseña temporal del administrador. */
export default function CambiarContrasena() {
  const { user, actualizarUsuario, logout } = useAuth()
  const [form, setForm] = useState({ actual: '', clave: '', confirmar: '' })
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const set = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: '' }))
  }

  async function enviar() {
    if (cargando) return
    setError('')
    const e = {}
    if (!form.actual) e.actual = 'Ingresa la contraseña temporal que te dieron.'
    const ec = errorContrasena(form.clave, user?.nombreUsuario)
    if (ec) e.clave = ec
    else if (form.clave === form.actual) e.clave = 'Debe ser distinta de la contraseña temporal.'
    if (!e.clave && form.confirmar !== form.clave) e.confirmar = 'Las contraseñas no coinciden.'
    setErrores(e)
    if (Object.keys(e).length) return
    setCargando(true)
    try {
      const { data } = await api.post('/auth/cambiar-contrasena', { contrasenaActual: form.actual, nuevaContrasena: form.clave })
      await actualizarUsuario({ debeCambiarContrasena: data.debeCambiarContrasena })   // el layout lleva al Panel
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <AccesoLayout>
      <Text style={T.titulo} accessibilityRole="header">Crea tu nueva contraseña</Text>
      <Text style={[T.subtitulo, { marginTop: 4, marginBottom: S.xl, lineHeight: 20 }]}>
        Hola {user?.nombreCompleto}. Ingresaste con una contraseña temporal; por seguridad crea una propia para continuar.
      </Text>
      {!!error && <Mensaje tipo="error">{error}</Mensaje>}
      <Campo etiqueta="Contraseña temporal" requerido error={errores.actual}>
        <EntradaClave icono={Lock} value={form.actual} onChangeText={(t) => set('actual', t)} error={errores.actual} />
      </Campo>
      <Campo etiqueta="Nueva contraseña" requerido error={errores.clave}>
        <EntradaClave icono={Lock} value={form.clave} onChangeText={(t) => set('clave', t)} error={errores.clave} />
      </Campo>
      <FuerzaContrasena clave={form.clave} usuario={user?.nombreUsuario} />
      <Campo etiqueta="Confirmar contraseña" requerido error={errores.confirmar}>
        <EntradaClave icono={Lock} value={form.confirmar} onChangeText={(t) => set('confirmar', t)} error={errores.confirmar} onSubmitEditing={enviar} />
      </Campo>
      <Boton titulo={cargando ? 'Guardando…' : 'Guardar y continuar'} icono={ShieldCheck} onPress={enviar} cargando={cargando} bloque />
      <Boton titulo="Cerrar sesión" icono={LogOut} variante="secundario" onPress={logout} bloque style={{ marginTop: S.sm }} />
    </AccesoLayout>
  )
}
