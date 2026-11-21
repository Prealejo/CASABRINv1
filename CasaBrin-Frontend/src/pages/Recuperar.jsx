import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  User, KeyRound, Lock, ArrowLeft, Loader2, ShieldCheck, UserCog, LogIn,
} from 'lucide-react'
import { api } from '../api/client.js'
import Campo from '../components/Campo.jsx'
import ContrasenaInput from '../components/ContrasenaInput.jsx'
import FuerzaContrasena from '../components/FuerzaContrasena.jsx'
import AuthLayout from '../components/AuthLayout.jsx'
import CodigoRecuperacionCard from '../components/CodigoRecuperacionCard.jsx'
import { Mensaje } from '../components/ui.jsx'
import { errorContrasena, formatearCodigo } from '../lib/contrasena.js'

/**
 * Recuperación de contraseña SIN correo:
 * el usuario se identifica con su código de recuperación de un solo uso
 * (lo genera el Administrador en Usuarios). Al terminar recibe un código nuevo.
 */
export default function Recuperar() {
  const [form, setForm] = useState({ usuario: '', codigo: '', clave: '', confirmar: '' })
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [codigoNuevo, setCodigoNuevo] = useState('')
  const [bloqMayus, setBloqMayus] = useState(false)

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: '' }))
  }

  function validar() {
    const e = {}
    const u = form.usuario.trim()
    if (!u) e.usuario = 'Ingresa tu usuario.'
    if (form.codigo.replace(/-/g, '').length !== 12) e.codigo = 'El código tiene 12 caracteres (XXXX-XXXX-XXXX).'
    const ec = errorContrasena(form.clave, u)
    if (ec) e.clave = ec
    if (!e.clave && form.confirmar !== form.clave) e.confirmar = 'Las contraseñas no coinciden.'
    setErrores(e)
    return e
  }

  async function enviar(ev) {
    ev.preventDefault()
    if (cargando) return
    setError('')
    const errs = validar()
    const primero = ['usuario', 'codigo', 'clave', 'confirmar'].find((k) => errs[k])
    if (primero) { document.getElementById(`rec-${primero}`)?.focus(); return }
    setCargando(true)
    try {
      const { data } = await api.post('/auth/recuperar', {
        usuario: form.usuario.trim(),
        codigoRecuperacion: form.codigo,
        nuevaContrasena: form.clave,
      })
      setCodigoNuevo(data.codigo)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  if (codigoNuevo) {
    return (
      <AuthLayout>
        <div className="login-form">
          <div className="exito-icono" aria-hidden="true"><ShieldCheck size={28} strokeWidth={1.75} /></div>
          <h1 className="login-titulo">Contraseña actualizada</h1>
          <p className="login-form-sub">
            Ya puedes iniciar sesión con tu nueva contraseña. Tu código anterior dejó de funcionar:
            <strong> guarda este nuevo código</strong> en un lugar seguro, lo necesitarás si vuelves a olvidar la contraseña.
          </p>
          <CodigoRecuperacionCard codigo={codigoNuevo} usuario={form.usuario.trim()} />
          <Link to="/login" className="btn btn-primary btn-block btn-grande" style={{ marginTop: '1.25rem' }}>
            <LogIn size={18} strokeWidth={1.75} aria-hidden="true" />Ir a iniciar sesión
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <form className="login-form" onSubmit={enviar} noValidate>
        <Link to="/login" className="volver"><ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />Volver a iniciar sesión</Link>
        <h1 className="login-titulo">Recuperar contraseña</h1>
        <p className="login-form-sub">Usa el código de recuperación que te entregó el administrador.</p>

        {error && <Mensaje tipo="error">{error}</Mensaje>}

        <Campo label="Usuario" icon={User} requerido error={errores.usuario}>
          <input
            id="rec-usuario"
            value={form.usuario}
            onChange={(e) => set('usuario', e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            disabled={cargando}
          />
        </Campo>

        <Campo label="Código de recuperación" icon={KeyRound} requerido error={errores.codigo} ayuda="Formato XXXX-XXXX-XXXX. Puedes escribirlo con o sin guiones.">
          <input
            id="rec-codigo"
            className="mono input-codigo"
            value={form.codigo}
            onChange={(e) => set('codigo', formatearCodigo(e.target.value))}
            placeholder="K7QM-3HZP-W9TX"
            autoComplete="one-time-code"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            disabled={cargando}
          />
        </Campo>

        <Campo label="Nueva contraseña" icon={Lock} requerido error={errores.clave} ayuda={bloqMayus ? '⇪ Bloq Mayús está activado.' : undefined}>
          <ContrasenaInput
            id="rec-clave"
            value={form.clave}
            onChange={(e) => set('clave', e.target.value)}
            onBloqMayus={setBloqMayus}
            autoComplete="new-password"
            disabled={cargando}
          />
        </Campo>
        <FuerzaContrasena clave={form.clave} usuario={form.usuario} />

        <Campo label="Confirmar contraseña" icon={Lock} requerido error={errores.confirmar}>
          <ContrasenaInput
            id="rec-confirmar"
            value={form.confirmar}
            onChange={(e) => set('confirmar', e.target.value)}
            autoComplete="new-password"
            disabled={cargando}
          />
        </Campo>

        <button className="btn btn-primary btn-block btn-grande" type="submit" disabled={cargando} aria-busy={cargando}>
          {cargando
            ? <><Loader2 size={18} strokeWidth={2} className="girando" aria-hidden="true" />Verificando…</>
            : <><ShieldCheck size={18} strokeWidth={1.75} aria-hidden="true" />Cambiar contraseña</>}
        </button>

        <div className="ayuda-sin-codigo">
          <UserCog size={18} strokeWidth={1.75} aria-hidden="true" />
          <div>
            <strong>¿No tienes tu código?</strong>
            <p>Pide al administrador que te asigne una contraseña temporal desde <em>Usuarios → Clave</em>. Al ingresar con ella, el sistema te pedirá crear una nueva.</p>
          </div>
        </div>
      </form>
    </AuthLayout>
  )
}
