import { useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Link } from 'expo-router'
import { User, Lock, LogIn, KeyRound, Settings, Server, Wifi } from 'lucide-react-native'
import { useAuth } from '../auth/AuthContext'
import { getApiUrl, guardarApiUrl, probarConexion } from '../api/client'
import { AccesoLayout } from '../components/Acceso'
import { Campo, Entrada, EntradaClave } from '../components/campos'
import { Boton, Mensaje } from '../components/ui'
import Hoja from '../components/Hoja'
import { C, S, T } from '../theme'

export default function Login() {
  const { login } = useAuth()
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const refClave = useRef(null)

  // Configuración del servidor (la IP de la PC con el backend)
  const [servidor, setServidor] = useState(false)
  const [url, setUrl] = useState(getApiUrl())
  const [estadoSrv, setEstadoSrv] = useState(null)   // { tipo, texto }
  const [probando, setProbando] = useState(false)

  function validar() {
    const e = {}
    const u = usuario.trim()
    if (!u) e.usuario = 'Ingresa tu usuario.'
    else if (u.length < 3) e.usuario = 'El usuario tiene al menos 3 caracteres.'
    else if (/\s/.test(u)) e.usuario = 'El usuario no lleva espacios.'
    if (!contrasena) e.contrasena = 'Ingresa tu contraseña.'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function enviar() {
    if (cargando) return
    setError('')
    if (!validar()) return
    setCargando(true)
    try {
      await login(usuario.trim(), contrasena)   // la navegación la decide el layout raíz
    } catch (e) {
      setError(e.message)
      setContrasena('')
      refClave.current?.focus()
    } finally {
      setCargando(false)
    }
  }

  async function probarYGuardar() {
    setProbando(true)
    setEstadoSrv(null)
    try {
      await probarConexion(url)
      const u = await guardarApiUrl(url)
      setUrl(u)
      setEstadoSrv({ tipo: 'ok', texto: `Conectado. La app usará ${u}` })
    } catch {
      setEstadoSrv({ tipo: 'error', texto: 'No hubo respuesta. Revisa la IP, que el backend esté encendido con --urls "http://0.0.0.0:5080" y que el celular esté en el mismo WiFi.' })
    } finally {
      setProbando(false)
    }
  }

  return (
    <AccesoLayout>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={T.titulo} accessibilityRole="header">Iniciar sesión</Text>
          <Text style={[T.subtitulo, { marginTop: 4, marginBottom: S.xl }]}>Ingresa con tu usuario de Casa Brin.</Text>
        </View>
        <Pressable onPress={() => setServidor(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Configurar servidor" style={{ padding: 6 }}>
          <Settings size={22} color={C.gray500} strokeWidth={1.9} />
        </Pressable>
      </View>

      {!!error && <Mensaje tipo="error">{error}</Mensaje>}

      <Campo etiqueta="Usuario" error={errores.usuario}>
        <Entrada
          icono={User}
          value={usuario}
          onChangeText={(t) => { setUsuario(t); if (errores.usuario) setErrores({ ...errores, usuario: '' }) }}
          placeholder="Tu usuario"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => refClave.current?.focus()}
          error={errores.usuario}
          editable={!cargando}
        />
      </Campo>
      <Campo etiqueta="Contraseña" error={errores.contrasena}>
        <EntradaClave
          ref={refClave}
          icono={Lock}
          value={contrasena}
          onChangeText={(t) => { setContrasena(t); if (errores.contrasena) setErrores({ ...errores, contrasena: '' }) }}
          placeholder="Tu contraseña"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={enviar}
          error={errores.contrasena}
          editable={!cargando}
        />
      </Campo>

      <View style={{ alignItems: 'flex-end', marginTop: -6, marginBottom: S.lg }}>
        <Link href="/recuperar" asChild>
          <Pressable hitSlop={8} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <KeyRound size={15} color={C.brand700} strokeWidth={2} />
            <Text style={{ color: C.brand700, fontWeight: '700' }}>¿Olvidaste tu contraseña?</Text>
          </Pressable>
        </Link>
      </View>

      <Boton titulo={cargando ? 'Ingresando…' : 'Ingresar'} icono={LogIn} onPress={enviar} cargando={cargando} bloque />

      <Text style={[T.mini, { textAlign: 'center', marginTop: S.xl }]}>Servidor: {getApiUrl()}</Text>

      <Hoja
        visible={servidor}
        titulo="Servidor de Casa Brin"
        icono={Server}
        onCerrar={() => setServidor(false)}
        alto="70%"
        pie={<Boton titulo="Probar y guardar" icono={Wifi} onPress={probarYGuardar} cargando={probando} style={{ flex: 1 }} />}
      >
        <Text style={[T.chico, { marginBottom: S.lg, lineHeight: 20 }]}>
          Escribe la IP de la computadora donde corre el backend. El celular y la computadora deben estar en la misma red WiFi.
        </Text>
        <Campo etiqueta="Dirección del backend" ayuda="Ejemplo: casabrin.runasp.net (en línea) o 192.168.100.95:5080 (red local)">
          <Entrada icono={Server} value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        </Campo>
        {estadoSrv && <Mensaje tipo={estadoSrv.tipo}>{estadoSrv.texto}</Mensaje>}
      </Hoja>
    </AccesoLayout>
  )
}
