import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { User, KeyRound, Lock, ArrowLeft, ShieldCheck, UserCog, LogIn } from 'lucide-react-native'
import { api } from '../api/client'
import { AccesoLayout, CodigoRecuperacion } from '../components/Acceso'
import { Campo, Entrada, EntradaClave, FuerzaContrasena } from '../components/campos'
import { Boton, Mensaje } from '../components/ui'
import { errorContrasena, formatearCodigo } from '../lib/contrasena'
import { C, R, S, T } from '../theme'

/** Recuperación sin correo: usuario + código de un solo uso entregado por el administrador. */
export default function Recuperar() {
  const router = useRouter()
  const [form, setForm] = useState({ usuario: '', codigo: '', clave: '', confirmar: '' })
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [codigoNuevo, setCodigoNuevo] = useState('')

  const set = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: '' }))
  }

  async function enviar() {
    if (cargando) return
    setError('')
    const e = {}
    const u = form.usuario.trim()
    if (!u) e.usuario = 'Ingresa tu usuario.'
    if (form.codigo.replace(/-/g, '').length !== 12) e.codigo = 'El código tiene 12 caracteres (XXXX-XXXX-XXXX).'
    const ec = errorContrasena(form.clave, u)
    if (ec) e.clave = ec
    if (!e.clave && form.confirmar !== form.clave) e.confirmar = 'Las contraseñas no coinciden.'
    setErrores(e)
    if (Object.keys(e).length) return
    setCargando(true)
    try {
      const { data } = await api.post('/auth/recuperar', { usuario: u, codigoRecuperacion: form.codigo, nuevaContrasena: form.clave })
      setCodigoNuevo(data.codigo)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  if (codigoNuevo) {
    return (
      <AccesoLayout>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.ok50, alignItems: 'center', justifyContent: 'center', marginBottom: S.md }}>
          <ShieldCheck size={28} color={C.ok700} strokeWidth={1.8} />
        </View>
        <Text style={T.titulo} accessibilityRole="header">Contraseña actualizada</Text>
        <Text style={[T.subtitulo, { marginVertical: S.md, lineHeight: 20 }]}>
          Ya puedes iniciar sesión. Tu código anterior dejó de funcionar: guarda este nuevo código en un lugar seguro.
        </Text>
        <CodigoRecuperacion codigo={codigoNuevo} usuario={form.usuario.trim()} />
        <Boton titulo="Ir a iniciar sesión" icono={LogIn} onPress={() => router.replace('/login')} bloque style={{ marginTop: S.xl }} />
      </AccesoLayout>
    )
  }

  return (
    <AccesoLayout>
      <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: S.lg }}>
        <ArrowLeft size={16} color={C.gray700} strokeWidth={2} />
        <Text style={{ fontWeight: '700', color: C.gray700 }}>Volver a iniciar sesión</Text>
      </Pressable>
      <Text style={T.titulo} accessibilityRole="header">Recuperar contraseña</Text>
      <Text style={[T.subtitulo, { marginTop: 4, marginBottom: S.xl }]}>Usa el código de recuperación que te entregó el administrador.</Text>

      {!!error && <Mensaje tipo="error">{error}</Mensaje>}

      <Campo etiqueta="Usuario" requerido error={errores.usuario}>
        <Entrada icono={User} value={form.usuario} onChangeText={(t) => set('usuario', t)} autoCapitalize="none" autoCorrect={false} error={errores.usuario} />
      </Campo>
      <Campo etiqueta="Código de recuperación" requerido error={errores.codigo} ayuda="Formato XXXX-XXXX-XXXX, con o sin guiones.">
        <Entrada
          icono={KeyRound}
          value={form.codigo}
          onChangeText={(t) => set('codigo', formatearCodigo(t))}
          placeholder="K7QM-3HZP-W9TX"
          autoCapitalize="characters"
          autoCorrect={false}
          mono
          error={errores.codigo}
        />
      </Campo>
      <Campo etiqueta="Nueva contraseña" requerido error={errores.clave}>
        <EntradaClave icono={Lock} value={form.clave} onChangeText={(t) => set('clave', t)} error={errores.clave} />
      </Campo>
      <FuerzaContrasena clave={form.clave} usuario={form.usuario} />
      <Campo etiqueta="Confirmar contraseña" requerido error={errores.confirmar}>
        <EntradaClave icono={Lock} value={form.confirmar} onChangeText={(t) => set('confirmar', t)} error={errores.confirmar} onSubmitEditing={enviar} />
      </Campo>

      <Boton titulo={cargando ? 'Verificando…' : 'Cambiar contraseña'} icono={ShieldCheck} onPress={enviar} cargando={cargando} bloque />

      <View style={{ flexDirection: 'row', gap: 10, marginTop: S.xl, padding: S.md, backgroundColor: C.gray50, borderRadius: R.sm, borderWidth: 1, borderColor: C.gray200 }}>
        <UserCog size={18} color={C.gray500} strokeWidth={1.9} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: C.ink, marginBottom: 2 }}>¿No tienes tu código?</Text>
          <Text style={[T.chico, { lineHeight: 19 }]}>Pide al administrador una contraseña temporal desde Usuarios → Clave. Al ingresar con ella, el sistema te pedirá crear una nueva.</Text>
        </View>
      </View>
    </AccesoLayout>
  )
}
