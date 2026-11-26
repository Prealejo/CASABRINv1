import { useCallback, useEffect, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { Redirect } from 'expo-router'
import {
  UserPlus, User, IdCard, Mail, Shield, ShieldCheck, Lock, KeyRound, Pencil, UserX, CircleCheck, CircleMinus,
  CircleDot, Save, TriangleAlert, RotateCcw, Users,
} from 'lucide-react-native'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Pantalla from '../components/Pantalla'
import Hoja from '../components/Hoja'
import { CodigoRecuperacion } from '../components/Acceso'
import { Campo, Entrada, EntradaClave, FuerzaContrasena, Selector } from '../components/campos'
import { Badge, Boton, Cargando, Mensaje, Tarjeta, Vacio } from '../components/ui'
import { errorContrasena } from '../lib/contrasena'
import { C, R, S, T } from '../theme'

const ROLES = ['Admin', 'Operador']
const FORM_VACIO = { nombreUsuario: '', nombreCompleto: '', correo: '', rol: 'Operador', contrasena: '', activo: true }

function confirmar(titulo, mensaje) {
  return new Promise((resolve) => Alert.alert(titulo, mensaje, [
    { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
    { text: 'Aceptar', style: 'destructive', onPress: () => resolve(true) },
  ]))
}

export default function Usuarios() {
  const { user, esAdmin } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [form, setForm] = useState(null)            // null = cerrado
  const [editId, setEditId] = useState(null)
  const [errForm, setErrForm] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [passUser, setPassUser] = useState(null)
  const [pass, setPass] = useState('')
  const [errPass, setErrPass] = useState('')
  const [codigo, setCodigo] = useState(null)        // { usuario, codigo, nuevo }

  const cargar = useCallback(() => api.get('/usuarios')
    .then(({ data }) => setUsuarios(data))
    .catch((e) => setError(e.message))
    .finally(() => setCargando(false)), [])
  useEffect(() => { if (esAdmin) cargar() }, [cargar, esAdmin])

  if (!esAdmin) return <Redirect href="/" />   // pantalla solo para administradores

  const yo = usuarios.find((u) => u.idUsuario === user?.idUsuario)

  function nuevo() { setEditId(null); setForm({ ...FORM_VACIO }); setErrForm(''); setOk('') }
  function editar(u) {
    setEditId(u.idUsuario)
    setForm({ nombreUsuario: u.nombreUsuario, nombreCompleto: u.nombreCompleto, correo: u.correo || '', rol: u.rol, contrasena: '', activo: u.activo })
    setErrForm(''); setOk('')
  }

  async function guardar() {
    setErrForm('')
    const creando = !editId
    if (creando) {
      if (form.nombreUsuario.trim().length < 3) return setErrForm('El usuario debe tener al menos 3 caracteres.')
      if (/\s/.test(form.nombreUsuario.trim())) return setErrForm('El usuario no puede llevar espacios.')
    }
    if (!form.nombreCompleto.trim()) return setErrForm('Escribe el nombre completo.')
    if (creando) { const ec = errorContrasena(form.contrasena, form.nombreUsuario); if (ec) return setErrForm(ec) }
    setGuardando(true)
    try {
      if (creando) {
        const { data: creado } = await api.post('/usuarios', {
          nombreUsuario: form.nombreUsuario.trim(), nombreCompleto: form.nombreCompleto.trim(),
          correo: form.correo.trim() || null, contrasena: form.contrasena, rol: form.rol,
        })
        setOk('Usuario creado correctamente.')
        try {
          const { data } = await api.post(`/usuarios/${creado.idUsuario}/codigo-recuperacion`)
          setCodigo({ usuario: creado.nombreUsuario, codigo: data.codigo, nuevo: true })
        } catch { /* se puede generar después con «Código» */ }
      } else {
        await api.put(`/usuarios/${editId}`, { nombreCompleto: form.nombreCompleto.trim(), correo: form.correo.trim() || null, rol: form.rol, activo: form.activo })
        setOk('Usuario actualizado.')
      }
      setForm(null)
      await cargar()
    } catch (e) { setErrForm(e.message) } finally { setGuardando(false) }
  }

  async function desactivar(u) {
    if (!(await confirmar('Dar de baja', `¿Desactivar a ${u.nombreCompleto}? No podrá iniciar sesión.`))) return
    setError(''); setOk('')
    try { await api.delete(`/usuarios/${u.idUsuario}`); setOk('Usuario desactivado.'); await cargar() } catch (e) { setError(e.message) }
  }

  async function guardarPass() {
    const ec = errorContrasena(pass, passUser?.nombreUsuario)
    if (ec) { setErrPass(ec); return }
    try {
      await api.put(`/usuarios/${passUser.idUsuario}/password`, { nuevaContrasena: pass })
      setOk(`Contraseña temporal asignada a ${passUser.nombreUsuario}. Al ingresar deberá crear una nueva.`)
      setPassUser(null); setPass('')
      await cargar()
    } catch (e) { setErrPass(e.message) }
  }

  async function generarCodigo(u) {
    const extra = u.tieneCodigoRecuperacion ? `\n\nEl código anterior de ${u.nombreUsuario} dejará de funcionar.` : ''
    if (!(await confirmar('Código de recuperación', `¿Generar un código para ${u.nombreCompleto}?${extra}`))) return
    setError(''); setOk('')
    try {
      const { data } = await api.post(`/usuarios/${u.idUsuario}/codigo-recuperacion`)
      setCodigo({ usuario: u.nombreUsuario, codigo: data.codigo, nuevo: false })
      await cargar()
    } catch (e) { setError(e.message) }
  }

  return (
    <Pantalla
      titulo="Usuarios"
      subtitulo="Gestiona quién puede acceder al sistema y con qué rol."
      acciones={<Boton titulo="Nuevo usuario" icono={UserPlus} onPress={nuevo} style={{ flex: 1 }} />}
    >
      {!!error && <Mensaje tipo="error">{error}</Mensaje>}
      {!!ok && <Mensaje tipo="ok">{ok}</Mensaje>}

      {yo && !yo.tieneCodigoRecuperacion && (
        <View style={{ backgroundColor: C.warn50, borderColor: C.warn200, borderWidth: 1, borderRadius: R.sm, padding: S.md, marginBottom: S.md, gap: S.sm }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TriangleAlert size={18} color={C.warn700} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', color: C.warn700 }}>Aún no tienes código de recuperación.</Text>
              <Text style={[T.chico, { lineHeight: 19 }]}>Sin correo, es la única forma de recuperar tu cuenta de administrador si olvidas la contraseña.</Text>
            </View>
          </View>
          <Boton chico icono={KeyRound} titulo="Generar mi código" onPress={() => generarCodigo(yo)} />
        </View>
      )}

      {cargando ? <Cargando texto="Cargando usuarios…" /> : usuarios.length === 0 ? <Tarjeta><Vacio icono={Users}>No hay usuarios.</Vacio></Tarjeta> : usuarios.map((u) => (
        <Tarjeta key={u.idUsuario} style={{ marginBottom: S.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', fontSize: 16, color: C.ink }}>{u.nombreCompleto}</Text>
              <Text style={{ fontFamily: 'monospace', color: C.gray700 }}>{u.nombreUsuario}</Text>
              {!!u.correo && <Text style={T.mini}>{u.correo}</Text>}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              {u.rol === 'Admin'
                ? <Badge texto="Admin" icono={ShieldCheck} bg={C.brand50} borde={C.brand200} color={C.brand700} />
                : <Badge texto="Operador" icono={User} bg={C.gray100} borde={C.gray200} color={C.gray700} />}
              {u.activo
                ? <Badge texto="Activo" icono={CircleCheck} bg={C.ok50} borde={C.ok200} color={C.ok700} />
                : <Badge texto="Inactivo" icono={CircleMinus} bg={C.gray100} borde={C.gray200} color={C.gray700} />}
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {!u.tieneCodigoRecuperacion && <Badge texto="Sin código" icono={TriangleAlert} bg={C.warn50} borde={C.warn200} color={C.warn700} />}
            {u.debeCambiarContrasena && <Badge texto="Clave temporal" icono={RotateCcw} bg={C.info50} borde={C.info200} color={C.info700} />}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginTop: S.md }}>
            <Boton chico variante="secundario" icono={Pencil} titulo="Editar" onPress={() => editar(u)} style={{ flexGrow: 1 }} accessibilityLabel={`Editar a ${u.nombreCompleto}`} />
            <Boton chico variante="secundario" icono={Lock} titulo="Clave" onPress={() => { setPassUser(u); setPass(''); setErrPass(''); setOk('') }} style={{ flexGrow: 1 }} accessibilityLabel={`Asignar contraseña temporal a ${u.nombreCompleto}`} />
            <Boton chico variante="secundario" icono={KeyRound} titulo="Código" onPress={() => generarCodigo(u)} style={{ flexGrow: 1 }} accessibilityLabel={`Generar código de recuperación de ${u.nombreCompleto}`} />
            {u.activo && u.idUsuario !== user?.idUsuario && (
              <Boton chico variante="peligro" icono={UserX} titulo="Baja" onPress={() => desactivar(u)} style={{ flexGrow: 1 }} accessibilityLabel={`Dar de baja a ${u.nombreCompleto}`} />
            )}
          </View>
        </Tarjeta>
      ))}

      {/* Alta / edición */}
      <Hoja
        visible={!!form}
        titulo={editId ? `Editar: ${form?.nombreUsuario}` : 'Nuevo usuario'}
        icono={editId ? Pencil : UserPlus}
        onCerrar={() => !guardando && setForm(null)}
        pie={(
          <>
            <Boton titulo="Cancelar" variante="secundario" onPress={() => setForm(null)} deshabilitado={guardando} />
            <Boton titulo={guardando ? 'Guardando…' : editId ? 'Guardar cambios' : 'Crear usuario'} icono={Save} onPress={guardar} cargando={guardando} style={{ flex: 1 }} />
          </>
        )}
      >
        {form && (
          <>
            {!!errForm && <Mensaje tipo="error">{errForm}</Mensaje>}
            <Campo etiqueta="Usuario" requerido>
              <Entrada icono={User} value={form.nombreUsuario} onChangeText={(v) => setForm({ ...form, nombreUsuario: v })} editable={!editId} placeholder="Ej. jperez" autoCapitalize="none" autoCorrect={false} />
            </Campo>
            <Campo etiqueta="Nombre completo" requerido>
              <Entrada icono={IdCard} value={form.nombreCompleto} onChangeText={(v) => setForm({ ...form, nombreCompleto: v })} placeholder="Ej. Juan Pérez" />
            </Campo>
            <Campo etiqueta="Correo">
              <Entrada icono={Mail} value={form.correo} onChangeText={(v) => setForm({ ...form, correo: v })} placeholder="opcional" keyboardType="email-address" autoCapitalize="none" />
            </Campo>
            <Campo etiqueta="Rol" requerido>
              <Selector valor={form.rol} onCambio={(v) => setForm({ ...form, rol: v })} icono={Shield} titulo="Rol" opciones={ROLES.map((r) => ({ valor: r, texto: r }))} />
            </Campo>
            {!editId ? (
              <>
                <Campo etiqueta="Contraseña" requerido>
                  <EntradaClave icono={Lock} value={form.contrasena} onChangeText={(v) => setForm({ ...form, contrasena: v })} />
                </Campo>
                <FuerzaContrasena clave={form.contrasena} usuario={form.nombreUsuario} />
              </>
            ) : (
              <Campo etiqueta="Estado">
                <Selector valor={form.activo ? '1' : '0'} onCambio={(v) => setForm({ ...form, activo: v === '1' })} icono={CircleDot} titulo="Estado"
                  opciones={[{ valor: '1', texto: 'Activo' }, { valor: '0', texto: 'Inactivo' }]} />
              </Campo>
            )}
          </>
        )}
      </Hoja>

      {/* Contraseña temporal */}
      <Hoja
        visible={!!passUser}
        titulo={`Contraseña temporal${passUser ? `: ${passUser.nombreUsuario}` : ''}`}
        icono={Lock}
        onCerrar={() => { setPassUser(null); setPass('') }}
        alto="70%"
        pie={<Boton titulo="Asignar contraseña" icono={Save} onPress={guardarPass} style={{ flex: 1 }} />}
      >
        <Text style={[T.chico, { marginBottom: S.lg, lineHeight: 19 }]}>Úsalo cuando el usuario perdió su código de recuperación. Al ingresar con esta contraseña, el sistema le pedirá crear una propia.</Text>
        <Campo etiqueta="Contraseña temporal" requerido error={errPass}>
          <EntradaClave icono={Lock} value={pass} onChangeText={(v) => { setPass(v); setErrPass('') }} error={errPass} />
        </Campo>
        <FuerzaContrasena clave={pass} usuario={passUser?.nombreUsuario} />
      </Hoja>

      {/* Código generado */}
      <Hoja
        visible={!!codigo}
        titulo="Código de recuperación"
        icono={KeyRound}
        onCerrar={() => setCodigo(null)}
        alto="75%"
        pie={<Boton titulo="Listo, ya lo guardé" onPress={() => setCodigo(null)} style={{ flex: 1 }} />}
      >
        {codigo && (
          <>
            <Text style={[T.chico, { marginBottom: S.lg, lineHeight: 19 }]}>
              {codigo.nuevo ? 'Usuario creado. ' : ''}Entrega este código a {codigo.usuario}. Con él podrá crear una nueva contraseña desde «¿Olvidaste tu contraseña?» sin correo.
            </Text>
            <CodigoRecuperacion codigo={codigo.codigo} usuario={codigo.usuario} />
          </>
        )}
      </Hoja>
    </Pantalla>
  )
}
