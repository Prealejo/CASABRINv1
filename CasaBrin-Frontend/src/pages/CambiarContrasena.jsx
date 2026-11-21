import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Loader2, ShieldCheck, LogOut } from 'lucide-react'
import { api } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import Campo from '../components/Campo.jsx'
import ContrasenaInput from '../components/ContrasenaInput.jsx'
import FuerzaContrasena from '../components/FuerzaContrasena.jsx'
import AuthLayout from '../components/AuthLayout.jsx'
import { Mensaje } from '../components/ui.jsx'
import { errorContrasena } from '../lib/contrasena.js'

/** Cambio obligatorio de contraseña después de recibir una clave temporal del administrador. */
export default function CambiarContrasena() {
  const { user, actualizarUsuario, logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ actual: '', clave: '', confirmar: '' })
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: '' }))
  }

  async function enviar(ev) {
    ev.preventDefault()
    if (cargando) return
    setError('')
    const e = {}
    if (!form.actual) e.actual = 'Ingresa la contraseña temporal que te dieron.'
    const ec = errorContrasena(form.clave, user?.nombreUsuario)
    if (ec) e.clave = ec
    else if (form.clave === form.actual) e.clave = 'Debe ser distinta de la contraseña temporal.'
    if (!e.clave && form.confirmar !== form.clave) e.confirmar = 'Las contraseñas no coinciden.'
    setErrores(e)
    const primero = ['actual', 'clave', 'confirmar'].find((k) => e[k])
    if (primero) { document.getElementById(`cc-${primero}`)?.focus(); return }

    setCargando(true)
    try {
      const { data } = await api.post('/auth/cambiar-contrasena', {
        contrasenaActual: form.actual,
        nuevaContrasena: form.clave,
      })
      actualizarUsuario({ debeCambiarContrasena: data.debeCambiarContrasena })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <AuthLayout>
      <form className="login-form" onSubmit={enviar} noValidate>
        <h1 className="login-titulo">Crea tu nueva contraseña</h1>
        <p className="login-form-sub">
          Hola <strong>{user?.nombreCompleto}</strong>. Ingresaste con una contraseña temporal;
          por seguridad crea una propia para continuar.
        </p>

        {error && <Mensaje tipo="error">{error}</Mensaje>}

        <Campo label="Contraseña temporal" icon={Lock} requerido error={errores.actual}>
          <ContrasenaInput id="cc-actual" value={form.actual} onChange={(e) => set('actual', e.target.value)} autoComplete="current-password" autoFocus disabled={cargando} />
        </Campo>
        <Campo label="Nueva contraseña" icon={Lock} requerido error={errores.clave}>
          <ContrasenaInput id="cc-clave" value={form.clave} onChange={(e) => set('clave', e.target.value)} autoComplete="new-password" disabled={cargando} />
        </Campo>
        <FuerzaContrasena clave={form.clave} usuario={user?.nombreUsuario} />
        <Campo label="Confirmar contraseña" icon={Lock} requerido error={errores.confirmar}>
          <ContrasenaInput id="cc-confirmar" value={form.confirmar} onChange={(e) => set('confirmar', e.target.value)} autoComplete="new-password" disabled={cargando} />
        </Campo>

        <button className="btn btn-primary btn-block btn-grande" type="submit" disabled={cargando} aria-busy={cargando}>
          {cargando
            ? <><Loader2 size={18} strokeWidth={2} className="girando" aria-hidden="true" />Guardando…</>
            : <><ShieldCheck size={18} strokeWidth={1.75} aria-hidden="true" />Guardar y continuar</>}
        </button>
        <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: '0.6rem' }} onClick={() => { logout(); navigate('/login', { replace: true }) }}>
          <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />Cerrar sesión
        </button>
      </form>
    </AuthLayout>
  )
}
